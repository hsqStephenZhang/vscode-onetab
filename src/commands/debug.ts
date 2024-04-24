import { Global } from "../common/global";
import { deleteAllKeys, listAllKeys } from "../utils/debug";

export function debugState() {
    listAllKeys();
}

export function clearState() {
    deleteAllKeys();
    Global.tabsProvider.clearState();
    Global.branchesProvider.clearState();
}