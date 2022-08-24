// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

export interface Message {
  cmd: string;
  page?: string;
  data: any;
}
