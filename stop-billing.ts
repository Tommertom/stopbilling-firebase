import { CloudBillingClient } from "@google-cloud/billing";
import { onMessagePublished } from "firebase-functions/v2/pubsub";

/*

HOW TO SETUP
https://cloud.google.com/billing/docs/how-to/disable-billing-with-notifications

- create a budget alert on the project with trigger level as defined in config.maxBudgetSpentToTriggerDowngrade (or EUR500)
- link pubsub topic to the budget alert - "downgrade-plan"
- add Project Billing Manager principal to Cloud Run service account
- Add Cloudn Run service account to the project as Project Billing Manager (Account Management)
- activate cloud billing api https://console.cloud.google.com/apis/api/cloudbilling.googleapis.com

- deploy the function to the server ( firebase deploy --only functions:stopBilling)

*/

/*

HOW TO TEST

Submit this message to the pubsub topic "downgrade-plan" using cloud console.
Change the costAmount to trigger the downgrade plan

https://console.cloud.google.com/cloudpubsub/topic/detail/downgrade-plan?tab=messages

{
    "budgetDisplayName": "stuff",
    "alertThresholdExceeded": 0.0,
    "costAmount": 6000,
    "costIntervalStart": "2019-01-01T00:00:00Z",
    "budgetAmount": 100.00,
    "budgetAmountType": "SPECIFIED_AMOUNT",
    "currencyCode": "USD"
}

Check in billing account, under Account Management, that the billing account does not have the project linked anymore.


*/

/*
  After downgrade, getting back to track is:
  - Firebase -> bring back to pay as you go - functions should still be there
  - VPC and static IP -> is down again

*/

const PROJECT_ID = process.env.GCLOUD_PROJECT;
const PROJECT_NAME = `projects/${PROJECT_ID}`;
const billing = new CloudBillingClient();

//
// PUBSUB FUNCTION
//
export const stopBilling = onMessagePublished(
  "downgrade-plan",
  async (event) => {
    const message = event.data.message.json;
    try {
      await handlePubSub(message);
    } catch (e) {
      console.log("Error receiving data from pubsub", e);
      console.log("Data ", message);
    }
  }
);

async function handlePubSub(data: any) {
  const amountSpent = data.costAmount;
  const treshold = 50;
  const alertThresholdExceeded =
    data.alertThresholdExceeded === undefined
      ? false
      : data.alertThresholdExceeded === 1;

  if (amountSpent === undefined) {
    console.log("Amount spent is undefined - this is weird - report to admin");
    return "Amount spent is undefined - this is weird - report to admin";
  }

  if (amountSpent < treshold) {
    return "No action necessary. (Current cost: " + amountSpent + ")";
  }

  if (amountSpent > treshold || alertThresholdExceeded) {
    const billingEnabled = await _isBillingEnabled(PROJECT_NAME);
    if (billingEnabled) {
      console.log("Billing is enabled, disabling now");

      await _disableBillingForProject(PROJECT_NAME);
      return "Billing has been disabled for the project: " + PROJECT_NAME;
    } else {
      console.log("Billing is already disabled");
      return "Billing is already disabled";
    }
  }

  return "No action necessary. (Current cost: " + amountSpent + ")";
}

const _isBillingEnabled = async (projectName: string) => {
  try {
    const [res] = await billing.getProjectBillingInfo({ name: projectName });
    return res.billingEnabled;
  } catch (e) {
    console.log(
      "Unable to determine if billing is enabled on specified project, assuming billing is enabled",
      e
    );
    return true;
  }
};

const _disableBillingForProject = async (name: string) => {
  try {
    const res = await billing.updateProjectBillingInfo({
      name,
      projectBillingInfo: {
        billingAccountName: "",
      },
    });
  } catch (e) {
    console.log("Unable to disable billing for the specified project", e);
    throw e;
  }
};
