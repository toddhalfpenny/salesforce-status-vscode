/**
 * Org Service
 */
import { readFileSync } from "fs";
import { AuthInfo, Connection } from "@salesforce/core-bundle";

export interface OrgEvent {
  id: number;
  additionalInformation?: string;
  externalId?: string;
  name?: string;
  type: "Incident" | "Maintenance";
  subType: string; // "performanceDegradation", "release", "scheduledMaintenance"
  status?: string;
  availability?: string; // "fullyAvailable" , "available"
  severity?: string; // "minor"
  parent?: number; // For incidentImpacts - goes to parent
  startTime: number;
  endTime: number;
}

interface StatusCallResult {
  key: string;
  location: string;
  environment: string;
  releaseVersion: string;
  releaseNumber: string;
  status: string;
  Incidents: {
    id: number;
    message: {
      pathToResolution: string;
      actionPlan: string;
      rootCause: string;
    };
    externalId: string;
    IncidentImpacts: {
      id: number;
      startTime: string;
      endTime: string;
      severity: string;
      type: string;
    }[];
  }[];
  Maintenances: {
    id: number;
    message: {
      maintenanceType: string;
      availability: string;
      eventStatus: string;
    };
    externalId: string;
    name: string;
    plannedStartTime: string;
    plannedEndTime: string;
    additionalInformation: string;
  }[];
  fetchedTime: number;
}

const SF_DIR = ".sfdx/";
const ALIASES_FILE = "alias.json";
const CUR_ORG_FILE = "sfdx-config.json";

export async function getAliases() {
  try {
    const homedir = require("os").homedir();
    const aliases = JSON.parse(
      readFileSync(`${homedir}/${SF_DIR}${ALIASES_FILE}`).toString(),
    );
    console.log("Aliases:", aliases.orgs);
    return aliases.orgs;
  } catch (error) {
    console.error("Failed to read aliases files");
    console.error(error);
  }
}

export async function getAlias(path: string) {
  try {
    const config = JSON.parse(
      readFileSync(`${path}/${SF_DIR}${CUR_ORG_FILE}`).toString(),
    );
    console.log("Alias:", config.defaultusername);
    return config.defaultusername;
  } catch (error) {
    console.error("Failed to read aliases file");
    console.error(error);
  }
}

export async function getDefaultAlias() {
  try {
    const path = require("os").homedir();
    return await getAlias(path);
  } catch (error) {
    // TODO throw
  }
}

export async function getProjectAlias() {
  try {
    const path = "./";
    return await getAlias(path);
  } catch (error) {
    // TODO throw
  }
}

export async function getDefaultInstance() {
  try {
    let alias = (await getProjectAlias()) ?? (await getDefaultAlias());
    console.log("alias", alias);
    const aliases = await getAliases();
    const uname = aliases[alias];
    const instance = (await getOrgRecord(uname)).records[0];
    return instance;
  } catch (error) {
    console.error(error);
  }
}

async function getOrgRecord(uname: string) {
  console.log("getOrgRecord", uname);
  const connection = await Connection.create({
    authInfo: await AuthInfo.create({ username: uname }),
  });
  console.log(connection);
  const rawQueryData = await connection.query(
    "SELECT InstanceName, isSandbox, TrialExpirationDate from Organization",
  );
  console.log(rawQueryData);
  return rawQueryData;
}

export async function createMD(status: any, instanceRec: any): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const orgEvents: OrgEvent[] = await parseOrgEvents(
      status as StatusCallResult,
    );
    console.log("orgEvents", orgEvents);

    let md = `# ${status.key}\n\r`;
    md += `## Summary\n\rStatus: ${formatStatusStr(status.status)}\n\rEnv: ${status.environment}\n\rRelease: ${status.releaseVersion} (${status.releaseNumber})\n\rLocation: ${status.location}\n\r`;
    if (instanceRec.TrialExpirationDate) {
      md += `Org Expiry: ${formatOrgExpiry(instanceRec.TrialExpirationDate)}\n\r`;
    }
    md += `## Incidents & Maintenances\n\r[View instance on status.salesforce.com](https://status.salesforce.com/instances/${status.key})\r\n`;
    md += `|Id|Name|Type|Sub type|Availability|Start|End|\n| -------- | ------- |------- |------- |------- |------- |------- |\n`;
    for (const event of orgEvents) {
      const startTime = formatDateStr(new Date(event.startTime));
      const endTime = formatDateStr(new Date(event.endTime));
      const eventUrl =
        event.type === "Maintenance"
          ? `https://status.salesforce.com/maintenances/${event.id}`
          : `https://status.salesforce.com/incidents/${event.parent}`;
      md += `|[${(event.parent ?? event.id)}](${eventUrl})|${(event.name) ?? event.type}|${event.type}|${event.subType}|${(event.availability) ?? event.severity}|${startTime}|${endTime}|\n`;
    }
    resolve(md);
  });
}

function parseOrgEvents(statusResponse: StatusCallResult): Promise<OrgEvent[]> {
  return new Promise(async (resolve, reject) => {
    // console.log('parseOrgEvents', statusResponse);
    const maintenanceEvents: OrgEvent[] = statusResponse.Maintenances.map(
      (inEvent) => {
        let outEvent: OrgEvent = {
          id: inEvent.id,
          additionalInformation: inEvent.additionalInformation,
          type: "Maintenance",
          externalId: inEvent.externalId,
          subType: formatEventStrings(inEvent.message.maintenanceType),
          name: inEvent.name,
          availability: formatEventStrings(inEvent.message.availability),
          status: inEvent.message.eventStatus,
          startTime: new Date(inEvent.plannedStartTime).valueOf(),
          endTime: new Date(inEvent.plannedEndTime).valueOf(),
        };
        return outEvent;
      },
    );
    let IncidentEvents: OrgEvent[] = [];
    for (let parentIncident of statusResponse.Incidents) {
      const pId = parentIncident.id;
      const externalId = parentIncident.externalId;
      for (let childIncident of parentIncident.IncidentImpacts) {
        let outEvent: OrgEvent = {
          id: childIncident.id,
          parent: parentIncident.id,
          type: "Incident",
          externalId: parentIncident.externalId,
          subType: formatEventStrings(childIncident.type),
          severity: childIncident.severity,
          startTime: new Date(childIncident.startTime).valueOf(),
          endTime: new Date(childIncident.endTime).valueOf(),
        };
        IncidentEvents.push(outEvent);
      }
    }
    const allEvents = IncidentEvents.concat(maintenanceEvents);
    resolve(
      allEvents.sort((a, b) => {
        if (a.startTime < b.startTime) {
          return -1;
        }
        if (a.startTime > b.startTime) {
          return 1;
        }
        return 0;
      }),
    );
  });
}

function formatEventStrings(type: string): string {
  switch (type) {
    case "available":
      return "Available";
    case "emergencyMaintenance":
      return "Emergency maintenance";
    case "featureServiceDisruption":
      return "Feature service disruption";
    case "fullyAvailable":
      return "Fully available";
    case "performanceDegradation":
      return "Performance degradation";
    case "readOnly":
      return "Read Only";
    case "release":
      return "Release";
    case "salesforceDataCloudFeatureDegradation":
      return "Data Cloud feature degradation";
    case "salesforceDataCloudServiceDegradation":
      return "Data Cloud service degradation";
    case "scheduledMaintenance":
      return "Scheduled maintenance";
    case "unavailable":
      return "Unavailable";
    default:
      console.error("unknown formatEventStrings()", type);
      return type;
  }
}

function formatStatusStr(status: string): string {
  const col: string = status === "OK" ? "green" : "red";
  return `<span style="padding:5px;background:${col};color:white;font-weight:bold;border-radius:5px">${status}</span>`;
}

function formatDateStr(d: Date): string {
  return (
    ("0" + d.getDate()).slice(-2) +
    "/" +
    ("0" + (d.getMonth() + 1)).slice(-2) +
    "/" +
    d.getFullYear() +
    " " +
    ("0" + d.getHours()).slice(-2) +
    ":" +
    ("0" + d.getMinutes()).slice(-2) +
    ":" +
    ("0" + d.getSeconds()).slice(-2)
  );
}

function formatOrgExpiry(expiry: Date): string {
  console.log("formatOrgExpiry");
  const now = new Date();
  const expiryDate = new Date(expiry);
  const daysDiff = datediff(now.valueOf(), expiryDate.valueOf());
  console.log("daysDiff", daysDiff);
  const col: string = daysDiff > 5 ? "" : "red";
  const weight: string = daysDiff > 5 ? "normal" : "bold";
  return `<span style="padding:5px;background:${col};color:white;font-weight:${weight};border-radius:5px">${formatDateStr(expiryDate)} (in ${daysDiff} days)</span>`;
}

function datediff(first: number, second: number) {
  console.log("datediff", first, second);
  return Math.round((second - first) / (1000 * 60 * 60 * 24));
}
