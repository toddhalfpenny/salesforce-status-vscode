/**
 * Org Service
 */

import { readFileSync } from "fs";
import { AuthInfo, Connection } from '@salesforce/core-bundle';

const SF_DIR = ".sfdx/";
const ALIASES_FILE = "alias.json";
const CUR_ORG_FILE = "sfdx-config.json";

export async function getAliases() {
  try {
    const homedir = require('os').homedir();
    const aliases = JSON.parse(readFileSync(`${homedir}/${SF_DIR}${ALIASES_FILE}`).toString());
    console.log("Aliases:", aliases.orgs);
    return aliases.orgs;
  } catch (error) {
    console.error('Failed to read aliases file');
    console.error(error);
  }
}


export async function getDefaultAlias() {
  try {
    const homedir = require('os').homedir();
    const config = JSON.parse(readFileSync(`${homedir}/${SF_DIR}${CUR_ORG_FILE}`).toString());
    console.log("Default Alias:", config.defaultusername);
    return config.defaultusername;
  } catch (error) {
    console.error('Failed to read aliases file');
    console.error(error);
  }
}

export async function getDefaultInstance() {
  try {
    const alias = await getDefaultAlias();
    const aliases = await getAliases();
    const uname = aliases[alias];
    const instance = (await getOrgRecord(uname)).records[0];
    return instance;
  } catch (error) {
    console.error(error);
  }
}


async function getOrgRecord(uname: string) {
	console.log('getOrgRecord', uname);
  const connection = await Connection.create({
		authInfo: await AuthInfo.create({ username: uname })
	});
	console.log(connection);
	const rawQueryData = await connection.query('SELECT InstanceName, isSandbox, TrialExpirationDate from Organization');
	console.log(rawQueryData);
  return rawQueryData;
}