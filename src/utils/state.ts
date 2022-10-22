// Copyright (c) 2022 hsqStephenZhang
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { WorkState } from "../common/state";
import { STORAGE_KEY } from "../constant";
import { TabsState } from "../model/main/tabstate";

export function getState(): TabsState {
    const state = Object.assign(
        new TabsState(),
        WorkState.get(STORAGE_KEY, new TabsState())
    );
    return state;
}