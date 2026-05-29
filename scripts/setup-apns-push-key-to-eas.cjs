#!/usr/bin/env node
/**
 * Ensure an APNs push key exists on EAS for iOS push notifications.
 *
 * Usage:
 *   node scripts/setup-apns-push-key-to-eas.cjs              # check only
 *   node scripts/setup-apns-push-key-to-eas.cjs --create     # create on Apple + upload to EAS
 *   node scripts/setup-apns-push-key-to-eas.cjs --upload-p8 ./AuthKey_XXX.p8 KEY_ID TEAM_ID
 *
 * Uses macOS Keychain for Apple ID password when EXPO_APPLE_PASSWORD is unset.
 * Set EXPO_APPLE_ID / EXPO_APPLE_TEAM_ID to override defaults.
 */
const fs = require('fs');
const path = require('path');
const JsonFile = require('@expo/json-file').default || require('@expo/json-file');
const { createGraphqlClient } = require('eas-cli/build/commandUtils/context/contextUtils/createGraphqlClient');
const { getStateJsonPath } = require('eas-cli/build/utils/paths');
const IosApi = require('eas-cli/build/credentials/ios/api/GraphqlClient');
const { getOwnerAccountForProjectIdAsync } = require('eas-cli/build/project/projectUtils');
const { AssignPushKey } = require('eas-cli/build/credentials/ios/actions/AssignPushKey');
const { CredentialsContext } = require('eas-cli/build/credentials/context');
const { getPrivateExpoConfigAsync } = require('eas-cli/build/project/expoConfig');

const PROJECT_ID = 'b2e1f900-e081-4397-95a7-0ac11f0c99eb';
const PROJECT_SLUG = 'mechanic';
const IOS_BUNDLE_ID = 'com.anonymous.mechanicplatformmobile';
const DEFAULT_APPLE_ID = 'deenorlucky@icloud.com';
const DEFAULT_TEAM_ID = 'X7S33Q79NJ';

function parseArgs(argv) {
  const args = { mode: 'check' };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--create') args.mode = 'create';
    else if (arg === '--upload-p8') {
      args.mode = 'upload-p8';
      args.p8Path = argv[++i];
      args.keyId = argv[++i];
      args.teamId = argv[++i] || DEFAULT_TEAM_ID;
    }
  }
  return args;
}

async function getClients(projectDir) {
  const auth = JsonFile.read(getStateJsonPath())?.auth;
  if (!auth?.sessionSecret && !process.env.EXPO_TOKEN) {
    throw new Error('Not logged in to Expo. Run: npx eas login');
  }

  const graphqlClient = createGraphqlClient({
    accessToken: process.env.EXPO_TOKEN ?? null,
    sessionSecret: auth?.sessionSecret ?? null,
  });

  const account = await getOwnerAccountForProjectIdAsync(graphqlClient, PROJECT_ID);
  const appLookupParams = {
    account,
    projectName: PROJECT_SLUG,
    bundleIdentifier: IOS_BUNDLE_ID,
  };

  const exp = await getPrivateExpoConfigAsync(projectDir);
  const projectId = exp?.extra?.eas?.projectId ?? PROJECT_ID;
  const ctx = new CredentialsContext({
    projectDir,
    graphqlClient,
    user: auth?.user ?? null,
    nonInteractive: true,
    autoAcceptCredentialReuse: true,
    shouldAskAuthenticateAppStore: false,
    projectInfo: { exp, projectId },
    easJsonCliConfig: null,
    analytics: null,
    vcsClient: null,
  });
  ctx.shouldAskAuthenticateAppStore = false;

  return { graphqlClient, account, appLookupParams, ctx };
}

async function ensureAssigned(graphqlClient, account, appLookupParams, ctx, pushKey) {
  await new AssignPushKey(appLookupParams).runAsync(ctx, pushKey);
  console.log(
    `APNs push key configured for @${account.name}/${PROJECT_SLUG} (${IOS_BUNDLE_ID}).`
  );
}

async function main() {
  const args = parseArgs(process.argv);
  const projectDir = path.join(__dirname, '..');

  if (!process.env.EXPO_APPLE_ID) process.env.EXPO_APPLE_ID = DEFAULT_APPLE_ID;
  if (!process.env.EXPO_APPLE_TEAM_ID) process.env.EXPO_APPLE_TEAM_ID = DEFAULT_TEAM_ID;

  const { graphqlClient, account, appLookupParams, ctx } = await getClients(projectDir);

  const existingPushKey = await IosApi.getPushKeyForAppAsync(graphqlClient, appLookupParams);
  if (existingPushKey) {
    console.log(
      `APNs push key already assigned (Key ID: ${existingPushKey.keyIdentifier}, team: ${existingPushKey.appleTeam?.appleTeamIdentifier ?? 'unknown'}).`
    );
    return;
  }

  console.log('No APNs push key assigned to this app yet.');

  if (args.mode === 'check') {
    const pushKeysForAccount = await IosApi.getPushKeysForAccountAsync(graphqlClient, account);
    console.log(`EAS account push keys: ${pushKeysForAccount.length}`);
    console.log('Run with --create to generate a new Apple key and upload to EAS.');
    process.exitCode = 1;
    return;
  }

  if (args.mode === 'upload-p8') {
    if (!args.p8Path || !args.keyId) {
      throw new Error('Usage: --upload-p8 <path-to.p8> <key-id> [team-id]');
    }
    const apnsKeyP8 = fs.readFileSync(path.resolve(args.p8Path), 'utf8');
    const pushKeyInput = {
      apnsKeyP8,
      apnsKeyId: args.keyId,
      teamId: args.teamId,
      teamName: `Team ${args.teamId}`,
    };
    const pushKey = await IosApi.createPushKeyAsync(graphqlClient, account, pushKeyInput);
    console.log(`Uploaded push key ${pushKey.keyIdentifier} to EAS.`);
    await ensureAssigned(graphqlClient, account, appLookupParams, ctx, pushKey);
    return;
  }

  const pushKeysForAccount = await IosApi.getPushKeysForAccountAsync(graphqlClient, account);
  let pushKey;
  if (pushKeysForAccount.length > 0) {
    pushKey = pushKeysForAccount[0];
    console.log(`Reusing EAS push key ${pushKey.keyIdentifier}.`);
  } else {
    console.log('Creating a new Apple APNs key...');
    await ctx.appStore.ensureAuthenticatedAsync({ mode: 'USER', teamId: DEFAULT_TEAM_ID });
    const applePushKey = await ctx.appStore.createPushKeyAsync(
      `Mechanic Platform Push ${new Date().toISOString().slice(0, 10)}`
    );
    pushKey = await IosApi.createPushKeyAsync(graphqlClient, account, applePushKey);
    console.log(`Created and uploaded push key ${pushKey.keyIdentifier} to EAS.`);
  }

  await ensureAssigned(graphqlClient, account, appLookupParams, ctx, pushKey);
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
