#!/usr/bin/env node
/**
 * Upload Firebase service account JSON to EAS for Android FCM V1 push.
 * Usage: node scripts/upload-fcm-v1-to-eas.cjs [path-to-json]
 */
const path = require('path');
const JsonFile = require('@expo/json-file').default || require('@expo/json-file');
const { createGraphqlClient } = require('eas-cli/build/commandUtils/context/contextUtils/createGraphqlClient');
const { getStateJsonPath } = require('eas-cli/build/utils/paths');
const { readAndValidateServiceAccountKey } = require('eas-cli/build/credentials/android/utils/googleServiceAccountKey');
const AndroidApi = require('eas-cli/build/credentials/android/api/GraphqlClient');
const { getOwnerAccountForProjectIdAsync } = require('eas-cli/build/project/projectUtils');

const PROJECT_ID = 'b2e1f900-e081-4397-95a7-0ac11f0c99eb';
const PROJECT_SLUG = 'mechanic';
const ANDROID_PACKAGE = 'com.denicksenauto.mechanic';

async function main() {
  const projectDir = path.join(__dirname, '..');
  const keyPath =
    process.argv[2] ||
    path.join(projectDir, 'credentials/fcm-v1-service-account.json');

  const auth = JsonFile.read(getStateJsonPath())?.auth;
  if (!auth?.sessionSecret && !process.env.EXPO_TOKEN) {
    console.error('Not logged in to Expo. Run: npx eas login');
    process.exit(1);
  }

  const jsonKey = readAndValidateServiceAccountKey(keyPath);
  const graphqlClient = createGraphqlClient({
    accessToken: process.env.EXPO_TOKEN ?? null,
    sessionSecret: auth?.sessionSecret ?? null,
  });

  const account = await getOwnerAccountForProjectIdAsync(graphqlClient, PROJECT_ID);
  const appLookupParams = {
    account,
    projectName: PROJECT_SLUG,
    androidApplicationIdentifier: ANDROID_PACKAGE,
  };

  const existing = await AndroidApi.getAndroidAppCredentialsWithCommonFieldsAsync(
    graphqlClient,
    appLookupParams
  );
  if (existing?.googleServiceAccountKeyForFcmV1) {
    const k = existing.googleServiceAccountKeyForFcmV1;
    console.log(
      `FCM V1 key already assigned (project: ${k.projectIdentifier}, email: ${k.clientEmail}).`
    );
    return;
  }

  const gsaKey = await AndroidApi.createGoogleServiceAccountKeyAsync(
    graphqlClient,
    account,
    jsonKey
  );
  const appCredentials =
    await AndroidApi.createOrGetExistingAndroidAppCredentialsWithBuildCredentialsAsync(
      graphqlClient,
      appLookupParams
    );
  await AndroidApi.updateAndroidAppCredentialsAsync(graphqlClient, appCredentials, {
    googleServiceAccountKeyForFcmV1Id: gsaKey.id,
  });

  console.log(
    `Uploaded and assigned FCM V1 key for ${ANDROID_PACKAGE} (@${account.name}/${PROJECT_SLUG}).`
  );
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
