"use client";

import { useEffect, useReducer, useRef } from "react";
import type { Dispatch } from "react";
import { basketReducer } from "./basket-state";
import type { BasketAction } from "./basket-state";
import { DEFAULT_STATE, decodeBasket, encodeBasket } from "./basket-url";
import type { BasketState } from "./basket-url";

/**
 * Sepet durumu ve URL senkronu (docs/web.md, Bölüm 5.3).
 *
 * - Tek doğruluk kaynağı URL'dir. İlk render varsayılan durumla yapılır (sunucu
 *   HTML'iyle aynı, hidrasyon uyuşmazlığı olmaz); hemen ardından query ve fragment
 *   tek bir dispatch ile okunur. Fragment sunucuya gitmediği için sunucuda okunamaz.
 * - Her değişiklik `history.replaceState` ile URL'e yazılır: `router.replace`
 *   gereksiz RSC isteği tetikler, `pushState` ise geçmişi her tuşta şişirir.
 *   Yazma `requestAnimationFrame` ile karede bire sınırlanır.
 * - URL'den okunan ilk durum geri yazılmaz; temiz "/" adresi kullanıcı bir şey
 *   değiştirene kadar temiz kalır.
 */

interface HookState {
  readonly basket: BasketState;
  /** URL'den okunan sepet; değişmedikçe URL'e geri yazılmaz. */
  readonly loaded: BasketState | null;
  readonly ready: boolean;
  readonly urlWasInvalid: boolean;
}

type HookAction =
  BasketAction | { readonly type: "loadFromUrl"; readonly decoded: BasketState | null };

function hookReducer(state: HookState, action: HookAction): HookState {
  if (action.type === "loadFromUrl") {
    const basket = action.decoded ?? state.basket;
    return {
      basket,
      loaded: basket,
      ready: true,
      urlWasInvalid: action.decoded === null,
    };
  }
  return { ...state, basket: basketReducer(state.basket, action) };
}

const INITIAL: HookState = {
  basket: DEFAULT_STATE,
  loaded: null,
  ready: false,
  urlWasInvalid: false,
};

export function useBasket(): {
  readonly state: BasketState;
  readonly dispatch: Dispatch<BasketAction>;
  /** URL'deki sepet bozuktu ve varsayılana dönüldü. */
  readonly urlWasInvalid: boolean;
  /** URL'den okuma tamamlandı (ilk boyamadan sonra true). */
  readonly ready: boolean;
} {
  const [{ basket, loaded, ready, urlWasInvalid }, dispatch] = useReducer(hookReducer, INITIAL);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    dispatch({
      type: "loadFromUrl",
      decoded: decodeBasket(window.location.search, window.location.hash),
    });
  }, []);

  useEffect(() => {
    // Kullanıcı girişi URL okumasıyla aynı render'a düşebilir; bu yüzden "ilk
    // çalışmayı atla" değil, "sepet URL'den okunduğu gibi mi" diye bakılır.
    if (!ready || basket === loaded) return;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const { search, hash } = encodeBasket(basket);
      const url = `${window.location.pathname}?${search}${hash === "" ? "" : `#${hash}`}`;
      window.history.replaceState(window.history.state, "", url);
    });
  }, [basket, loaded, ready]);

  return { state: basket, dispatch, urlWasInvalid, ready };
}
