// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { Global } from "../common/global";
import { WorkState } from "../common/state";
import { STORAGE_KEY } from "../constant";
import { TabsState } from "../model/main/tabstate";

export function getStateFromStorage(): TabsState {
    const defaultState = new TabsState();
    const s = WorkState.get(STORAGE_KEY, defaultState.toString());
    return TabsState.fromString(s);
}

export function currentState(): TabsState {
    return Global.tabsState;
}
