/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 7th May 2021 3:58:36 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { join } from "path";
import { commands, env, Uri, Terminal, window } from "vscode";
import { FlashTask } from "../../flash/flashTask";
import { readParameter } from "../../idfConfiguration";
import * as utils from "../../utils";
import { BuildTask } from "../../build/buildTask";
import { LocDictionary } from "../../localizationDictionary";
import { Logger } from "../../logger/logger";

const locDic = new LocDictionary(__filename);

export async function createMonitorTerminal(
  monitorTerminal: Terminal,
  workspace: Uri,
  serialPort?: string
) {
  if (BuildTask.isBuilding || FlashTask.isFlashing) {
    const waitProcessIsFinishedMsg = locDic.localize(
      "monitor.waitProcessIsFinishedMessage",
      "Wait for ESP-IDF task to finish"
    );
    Logger.errorNotify(
      waitProcessIsFinishedMsg,
      new Error("One_Task_At_A_Time")
    );
    return;
  }

  const idfPathDir =
    readParameter("idf.espIdfPath", workspace) || process.env.IDF_PATH;
  const pythonBinPath = readParameter("idf.pythonBinPath", workspace) as string;
  const port = serialPort ? serialPort : readParameter("idf.port", workspace);
  const idfPath = join(idfPathDir, "tools", "idf.py");
  const modifiedEnv = utils.appendIdfAndToolsToPath(workspace);
  if (!utils.isBinInPath(pythonBinPath, workspace.fsPath, modifiedEnv)) {
    Logger.errorNotify(
      "Python binary path is not defined",
      new Error("idf.pythonBinPath is not defined")
    );
    return;
  }
  if (!idfPathDir) {
    Logger.errorNotify(
      "ESP-IDF Path is not defined",
      new Error("idf.espIdfPath is not defined")
    );
    return;
  }
  if (!port) {
    try {
      await commands.executeCommand("espIdf.selectPort");
    } catch (error) {
      Logger.error("Unable to execute the command: espIdf.selectPort", error);
    }
    Logger.errorNotify(
      "Select a serial port before flashing",
      new Error("NOT_SELECTED_PORT")
    );
    return;
  }
  if (typeof monitorTerminal === "undefined") {
    monitorTerminal = window.createTerminal({
      name: "ESP-IDF Monitor",
      env: modifiedEnv,
      cwd: workspace.fsPath || modifiedEnv.IDF_PATH || process.cwd(),
      shellArgs: [],
      shellPath: env.shell,
      strictEnv: true,
    });
  }
  monitorTerminal.show();
  monitorTerminal.sendText(`${pythonBinPath} ${idfPath} -p ${port} monitor`);
  return monitorTerminal;
}
