import "server-only";
import { parseServerEnv } from "./env/schema";

/**
 * Sunucu tarafı ortam değişkenleri. `server-only` sayesinde bu modül bir client
 * bileşene import edilirse build kırılır; gizli değerler tarayıcı paketine giremez.
 */
export const serverEnv = parseServerEnv(process.env);
