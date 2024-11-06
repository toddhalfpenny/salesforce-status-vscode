/**
 * A service for calling the status.salesforce.com
 *
 */

const API_ENDPOINT: string = "https://api.status.salesforce.com/v1/";

export interface InstanceStatus {
  key: string;
  location: string;
  environment: string;
  releaseVersion: string;
  releaseNumber: string;
  status: string;
  isActive: boolean;
  Incidents: any[];
  Maintenances: any[];
}

export async function instanceStatus(
  instance: string,
): Promise<InstanceStatus> {
  try {
    const uri = `${API_ENDPOINT}instances/${instance}/status`;
    console.log(uri);
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    const statusJson = await response.json();
    return statusJson as InstanceStatus;
  } catch (error) {
    console.error(error);
    throw new Error(`Response status: ${error}`);
  }
}
