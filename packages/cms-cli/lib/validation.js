const { logger } = require('@hubspot/cms-lib/logger');
const {
  getPortalConfig,
  loadConfigFromEnvironment,
  Mode,
} = require('@hubspot/cms-lib');
const { getOauthManager } = require('@hubspot/cms-lib/oauth');
const {
  accessTokenForPersonalAccessKey,
} = require('@hubspot/cms-lib/personalAccessKey');
const { getPortalId, getMode } = require('./commonOpts');

/**
 * Validate that a portal was passed to the command and that the portal's configuration is valid
 *
 *
 * @param {object} command options
 * @returns {boolean}
 */
async function validatePortal(options) {
  const portalId = getPortalId(options);
  const { portalId: portalIdOption, portal: portalOption } = options;
  if (!portalId) {
    if (portalOption) {
      logger.error(
        `The portal "${portalOption}" could not be found in the config`
      );
    } else if (portalIdOption) {
      logger.error(`The portal "${portalId}" could not be found in the config`);
    } else {
      logger.error(
        'A portal needs to be supplied either via "--portal" or through setting a "defaultPortal"'
      );
    }
    return false;
  }

  if (portalOption && loadConfigFromEnvironment()) {
    throw new Error(
      'Cannot specify a portal when environment variables are supplied. Please unset the environment variables or do not use the "--portal" flag.'
    );
  }

  const portalConfig = getPortalConfig(portalId);
  if (!portalConfig) {
    logger.error(`The portal ${portalId} has not been configured`);
    return false;
  }

  const { authType, auth, apiKey, personalAccessKey } = portalConfig;

  if (authType === 'oauth2') {
    if (typeof auth !== 'object') {
      logger.error(
        `The OAuth2 auth configuration for portal ${portalId} is missing`
      );
      return false;
    }

    const { clientId, clientSecret, tokenInfo } = auth;

    if (!clientId || !clientSecret || !tokenInfo || !tokenInfo.refreshToken) {
      logger.error(
        `The OAuth2 configuration for portal ${portalId} is incorrect`
      );
      logger.error('Run "hscms auth oauth2" to reauthenticate');
      return false;
    }

    const oauth = getOauthManager(portalId, portalConfig);
    try {
      const accessToken = await oauth.accessToken();
      if (!accessToken) {
        logger.error(
          `The OAuth2 access token could not be found for portalId ${portalId}`
        );
        return false;
      }
    } catch (e) {
      logger.error(e.message);
      return false;
    }
  } else if (authType === 'personalaccesskey') {
    if (!personalAccessKey) {
      logger.error(
        `The portal "${portalId}" is configured to use a CMS access key for authentication and is missing a "personalAccessKey" in the configuration file`
      );
      return false;
    }

    try {
      const accessToken = await accessTokenForPersonalAccessKey(portalId);
      if (!accessToken) {
        logger.error(
          `An OAuth2 access token for portal "${portalId} could not be retrieved using the "personalAccessKey" provided`
        );
        return false;
      }
    } catch (e) {
      logger.error(e.message);
      return false;
    }
  } else if (!apiKey) {
    logger.error(
      `The portalId ${portalId} is missing authentication configuration`
    );
    return false;
  }

  return true;
}

/**
 * @param {object} command options
 * @returns {boolean}
 */
function validateMode(options) {
  const mode = getMode(options);
  if (Mode[mode]) {
    return true;
  }
  const modesMessage = `Available modes are: ${Object.values(Mode).join(
    ', '
  )}.`;
  if (mode != null) {
    logger.error([`The mode "${mode}" is invalid.`, modesMessage].join(' '));
  } else {
    logger.error(['The mode option is missing.', modesMessage].join(' '));
  }
  return false;
}

module.exports = {
  validateMode,
  validatePortal,
};
