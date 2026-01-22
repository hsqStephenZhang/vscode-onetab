import { Global } from "../global";
import { deleteAllKeys, listAllKeys } from "../utils/debug";

export function debugState() {
  listAllKeys();
}

export async function clearState() {
  deleteAllKeys();
  await Global.tabsProvider.clearState();
  await Global.branchesProvider.clearState();
}
