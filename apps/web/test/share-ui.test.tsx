// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShareActions } from "../components/result/ShareActions";
import { DEFAULT_STATE } from "../lib/basket-url";
import type { BasketState } from "../lib/basket-url";

const tl: BasketState = { ...DEFAULT_STATE, values: { konut: 30000, gida: 10000 } };
const pct: BasketState = { ...DEFAULT_STATE, mode: "pct", values: { konut: 75, gida: 25 } };
const percentUrl = () => `${window.location.origin}/sonuc?v=1&d=y&at=2026-09&w=gida.250~konut.750`;

/**
 * userEvent.setup() kendi pano taklidini navigator.clipboard'a kurar; bu yüzden
 * casus setup()'tan SONRA bağlanır.
 */
function setup(clipboard: "ok" | "fail" = "ok") {
  const user = userEvent.setup();
  const writeText = vi
    .spyOn(navigator.clipboard, "writeText")
    .mockImplementation(() =>
      clipboard === "ok" ? Promise.resolve() : Promise.reject(new Error("izin yok")),
    );
  return { user, writeText };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "share");
  Reflect.deleteProperty(navigator, "canShare");
});

describe("ShareActions", () => {
  it("varsayılan olarak tutarsız link kopyalar ve bunu söyler", async () => {
    const { user, writeText } = setup();
    render(<ShareActions state={tl} lastPeriod="2026-09" />);
    expect(screen.getByLabelText<HTMLInputElement>("TL tutarlarımı da linke ekle").checked).toBe(
      false,
    );
    expect(screen.getByText(/tutarların paylaşılmaz/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Linki kopyala" }));
    expect(writeText).toHaveBeenCalledWith(percentUrl());
    expect(screen.getByRole("status").textContent).toBe("Link kopyalandı.");
  });

  it("işaretlenirse tutarları fragment'e ekler ve uyarı metnini değiştirir", async () => {
    const { user, writeText } = setup();
    render(<ShareActions state={tl} lastPeriod="2026-09" />);
    await user.click(screen.getByLabelText("TL tutarlarımı da linke ekle"));
    expect(screen.getByText(/sunucuya gitmez ve yalnızca linki açan görür/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Linki kopyala" }));
    expect(writeText.mock.calls[0]?.[0]).toMatch(/#m=tl&s=gida\.10000~konut\.30000$/);
  });

  it("yüzde modunda tutar seçeneği gösterilmez", () => {
    render(<ShareActions state={pct} lastPeriod="2026-09" />);
    expect(screen.queryByLabelText("TL tutarlarımı da linke ekle")).toBeNull();
  });

  it("kopyalama başarısızsa yönlendirir", async () => {
    const { user } = setup("fail");
    render(<ShareActions state={tl} lastPeriod="2026-09" />);
    await user.click(screen.getByRole("button", { name: "Linki kopyala" }));
    expect(screen.getByRole("status").textContent).toMatch(/kopyalanamadı/);
  });

  it("Web Share yoksa kopyalar, varsa sistem paylaşımını açar", async () => {
    const { user, writeText } = setup();
    render(<ShareActions state={tl} lastPeriod="2026-09" />);
    await user.click(screen.getByRole("button", { name: "Paylaş" }));
    expect(writeText).toHaveBeenCalledTimes(1);

    const share = vi.fn(() => Promise.reject(new Error("AbortError")));
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    await user.click(screen.getByRole("button", { name: "Paylaş" }));
    expect(share).toHaveBeenCalledWith({ title: "Benim enflasyonum", url: percentUrl() });
    expect(writeText).toHaveBeenCalledTimes(1);
  });

  it("story kartını tutarsız görsel isteğiyle alır ve indirir", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(new Blob(["png"], { type: "image/png" }))),
    );
    vi.stubGlobal("fetch", fetchMock);
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    const { user } = setup();
    render(<ShareActions state={tl} lastPeriod="2026-09" />);
    await user.click(screen.getByRole("button", { name: "Story olarak indir" }));
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe("Story kartı indirildi.");
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/og?v=1&d=y&at=2026-09&w=gida.250~konut.750&format=story",
    );
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });

  it("dosya paylaşımı destekleniyorsa story kartını paylaşır", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(new Blob(["png"])))),
    );
    const share = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
    const { user } = setup();
    render(<ShareActions state={tl} lastPeriod="2026-09" />);
    await user.click(screen.getByRole("button", { name: "Story olarak indir" }));
    await waitFor(() => {
      expect(share).toHaveBeenCalled();
    });
  });

  it("görsel alınamazsa hata mesajı gösterir", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("", { status: 500 }))),
    );
    const { user } = setup();
    render(<ShareActions state={tl} lastPeriod="2026-09" />);
    await user.click(screen.getByRole("button", { name: "Story olarak indir" }));
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toMatch(/hazırlanamadı/);
    });
  });
});
