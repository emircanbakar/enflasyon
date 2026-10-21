// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useBasket } from "../lib/use-basket";

/** Bir sonraki animasyon karesini bekler (URL yazımı rAF ile yapılır). */
const nextFrame = () =>
  act(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      }),
  );

/**
 * Kullanıcı girişi, URL okumasıyla aynı render'a düşer: effect'ler bildirim
 * sırasıyla çalıştığı için `loadFromUrl` ve `setValue` tek seferde işlenir.
 * Yavaş cihazda hidrasyonun hemen ardından yazmaya başlamanın karşılığı.
 */
function TypesDuringLoad() {
  const { dispatch } = useBasket();
  useEffect(() => {
    dispatch({ type: "setValue", key: "ulastirma", value: 4000 });
  }, [dispatch]);
  return null;
}

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});
afterEach(cleanup);

describe("useBasket", () => {
  it("URL okumasıyla aynı render'a düşen değişikliği URL'e yazar", async () => {
    render(<TypesDuringLoad />);
    await nextFrame();
    expect(window.location.hash).toBe("#m=tl&s=ulastirma.4000");
  });
});
