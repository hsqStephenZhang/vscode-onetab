// Copyright (c) 2022 hsqStephenZhang
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import "reflect-metadata";
import { Type } from "class-transformer";
import { randomUUID } from "crypto";
import { DEFAULT_TAB_LABEL ,CONTEXT_TAB} from "../../constant";
import { Node } from "../interface/node";

export class TabItem extends Node {
  @Type(()=>vscode.Uri)
  public fileUri: vscode.Uri ;
  constructor(
  ) {
    super(DEFAULT_TAB_LABEL, vscode.TreeItemCollapsibleState.None);
    this.contextValue = CONTEXT_TAB;
    // for deserialization
    this.fileUri = vscode.Uri.parse("none");
    this.id = randomUUID();
  }

  public setFileUri(uri: vscode.Uri){
    this.fileUri=uri;
  }

  public setID(id:string){
    this.id=id;
  }

  public setLabel(label:string){
    this.label=label;
  }

  public setDefaultIcon(){
    this.iconPath = new vscode.ThemeIcon("output-view-icon");
  }
}
