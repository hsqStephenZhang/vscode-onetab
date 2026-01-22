// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { Global } from "../global";
import { WorkState } from "../common/state";

export function listAllKeys() {
  const keys = WorkState.keys();
  Global.logger.debug(`${keys}`);
  for (const key of keys) {
    const obj = WorkState.get(key, undefined);
    Global.logger.debug(`${key} is: ${JSON.stringify(obj)}`);
  }
}

export function deleteAllKeys() {
  Global.logger.debug(`Deleting all keys.`);
  const keys = WorkState.keys();
  for (const key of keys) {
    WorkState.delete(key);
  }
  Global.logger.debug(`All keys are deleted.`);
}
