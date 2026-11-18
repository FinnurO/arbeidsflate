import{Mr as e}from"./graphql.CJBaEyNO.js";var t=function(e){return e.CorrespondenceConfirmed=`CORRESPONDENCE_CONFIRMED`,e.CorrespondenceOpened=`CORRESPONDENCE_OPENED`,e.DialogClosed=`DIALOG_CLOSED`,e.DialogCreated=`DIALOG_CREATED`,e.DialogDeleted=`DIALOG_DELETED`,e.DialogOpened=`DIALOG_OPENED`,e.DialogRestored=`DIALOG_RESTORED`,e.FormSaved=`FORM_SAVED`,e.FormSubmitted=`FORM_SUBMITTED`,e.Information=`INFORMATION`,e.PaymentMade=`PAYMENT_MADE`,e.SentToFormFill=`SENT_TO_FORM_FILL`,e.SentToPayment=`SENT_TO_PAYMENT`,e.SentToSendIn=`SENT_TO_SEND_IN`,e.SentToSigning=`SENT_TO_SIGNING`,e.SignatureProvided=`SIGNATURE_PROVIDED`,e.TransmissionOpened=`TRANSMISSION_OPENED`,e}({}),n=function(e){return e.PartyRepresentative=`PARTY_REPRESENTATIVE`,e.ServiceOwner=`SERVICE_OWNER`,e}({}),r=function(e){return e.Api=`API`,e.Gui=`GUI`,e}({}),i=function(e){return e.AttachmentsExceedMaxLimit=`ATTACHMENTS_EXCEED_MAX_LIMIT`,e.ExpiringAttachments=`EXPIRING_ATTACHMENTS`,e.None=`NONE`,e.NotAccessToAllAttachments=`NOT_ACCESS_TO_ALL_ATTACHMENTS`,e.Unknown=`UNKNOWN`,e}({}),a=function(e){return e.DialogDeleted=`DIALOG_DELETED`,e.DialogUpdated=`DIALOG_UPDATED`,e}({}),o=function(e){return e.AccessPackage=`ACCESS_PACKAGE`,e.InstanceDelegation=`INSTANCE_DELEGATION`,e.ResourceDelegation=`RESOURCE_DELEGATION`,e.Role=`ROLE`,e}({}),s=function(e){return e.Awaiting=`AWAITING`,e.Completed=`COMPLETED`,e.Draft=`DRAFT`,e.InProgress=`IN_PROGRESS`,e.NotApplicable=`NOT_APPLICABLE`,e.RequiresAttention=`REQUIRES_ATTENTION`,e}({}),c=function(e){return e.Primary=`PRIMARY`,e.Secondary=`SECONDARY`,e.Tertiary=`TERTIARY`,e}({}),l=function(e){return e.Connect=`CONNECT`,e.Delete=`DELETE`,e.Get=`GET`,e.Head=`HEAD`,e.Options=`OPTIONS`,e.Patch=`PATCH`,e.Post=`POST`,e.Put=`PUT`,e.Trace=`TRACE`,e}({}),u=function(e){return e.Archive=`ARCHIVE`,e.Bin=`BIN`,e.Default=`DEFAULT`,e.MarkedAsUnopened=`MARKED_AS_UNOPENED`,e.Sent=`SENT`,e}({}),d=function(e){return e.Acceptance=`ACCEPTANCE`,e.Alert=`ALERT`,e.Correction=`CORRECTION`,e.Decision=`DECISION`,e.Information=`INFORMATION`,e.Rejection=`REJECTION`,e.Request=`REQUEST`,e.Submission=`SUBMISSION`,e}({}),f=function(){return f=Object.assign||function(e){for(var t,n=1,r=arguments.length;n<r;n++)for(var i in t=arguments[n],t)Object.prototype.hasOwnProperty.call(t,i)&&(e[i]=t[i]);return e},f.apply(this,arguments)},p=new Map,m=new Map,h=!0,g=!1;function _(e){return e.replace(/[\s,]+/g,` `).trim()}function v(e){return _(e.source.body.substring(e.start,e.end))}function y(e){var t=new Set,n=[];return e.definitions.forEach(function(e){if(e.kind===`FragmentDefinition`){var r=e.name.value,i=v(e.loc),a=m.get(r);a&&!a.has(i)?h&&console.warn(`Warning: fragment with name `+r+` already exists.
graphql-tag enforces all fragment names across your application to be unique; read more about
this in the docs: http://dev.apollodata.com/core/fragments.html#unique-names`):a||m.set(r,a=new Set),a.add(i),t.has(i)||(t.add(i),n.push(e))}else n.push(e)}),f(f({},e),{definitions:n})}function ee(e){var t=new Set(e.definitions);t.forEach(function(e){e.loc&&delete e.loc,Object.keys(e).forEach(function(n){var r=e[n];r&&typeof r==`object`&&t.add(r)})});var n=e.loc;return n&&(delete n.startToken,delete n.endToken),e}function b(t){var n=_(t);if(!p.has(n)){var r=e(t,{experimentalFragmentVariables:g,allowLegacyFragmentVariables:g});if(!r||r.kind!==`Document`)throw Error(`Not a valid GraphQL document.`);p.set(n,ee(y(r)))}return p.get(n)}function x(e){var t=[...arguments].slice(1);typeof e==`string`&&(e=[e]);var n=e[0];return t.forEach(function(t,r){t&&t.kind===`Document`?n+=t.loc.source.body:n+=t,n+=e[r+1]}),b(n)}function S(){p.clear(),m.clear()}function C(){h=!1}function w(){g=!0}function T(){g=!1}var E={gql:x,resetCaches:S,disableFragmentWarnings:C,enableExperimentalFragmentVariables:w,disableExperimentalFragmentVariables:T};(function(e){e.gql=E.gql,e.resetCaches=E.resetCaches,e.disableFragmentWarnings=E.disableFragmentWarnings,e.enableExperimentalFragmentVariables=E.enableExperimentalFragmentVariables,e.disableExperimentalFragmentVariables=E.disableExperimentalFragmentVariables})(x||={}),x.default=x;var D=x,O=D`
    fragment SeenLogFields on SeenLog {
  id
  seenAt
  seenBy {
    actorType
    actorId
    actorName
  }
  isCurrentEndUser
}
    `,k=D`
    fragment DialogContentFields on ContentValue {
  mediaType
  value {
    value
    languageCode
  }
}
    `,A=D`
    fragment SearchDialogFields on SearchDialog {
  id
  party
  org
  progress
  guiAttachmentCount
  status
  createdAt
  dueAt
  contentUpdatedAt
  isContentSeen
  serviceResourceType
  serviceResource
  hasUnopenedContent
  seenSinceLastContentUpdate {
    ...SeenLogFields
  }
  fromServiceOwnerTransmissionsCount
  fromPartyTransmissionsCount
  content {
    title {
      ...DialogContentFields
    }
    summary {
      ...DialogContentFields
    }
    senderName {
      ...DialogContentFields
    }
    extendedStatus {
      ...DialogContentFields
    }
  }
  endUserContext {
    systemLabels
  }
}
    ${O}
${k}`,j=D`
    fragment AttachmentFields on Attachment {
  id
  displayName {
    value
    languageCode
  }
  expiresAt
  urls {
    ...AttachmentUrlFields
  }
}
    ${D`
    fragment AttachmentUrlFields on AttachmentUrl {
  id
  url
  consumerType
  mediaType
}
    `}`,M=D`
    fragment DialogByIdFields on Dialog {
  id
  dialogToken
  party
  org
  progress
  serviceResourceType
  fromServiceOwnerTransmissionsCount
  fromPartyTransmissionsCount
  isContentSeen
  attachments {
    ...AttachmentFields
  }
  activities {
    ...DialogActivity
  }
  guiActions {
    ...GuiActionFields
  }
  seenSinceLastContentUpdate {
    ...SeenLogFields
  }
  transmissions {
    ...TransmissionFields
  }
  status
  dueAt
  createdAt
  contentUpdatedAt
  endUserContext {
    systemLabels
  }
  content {
    title {
      ...DialogContentFields
    }
    summary {
      ...DialogContentFields
    }
    senderName {
      ...DialogContentFields
    }
    additionalInfo {
      ...DialogContentFields
    }
    extendedStatus {
      ...DialogContentFields
    }
    mainContentReference {
      ...DialogContentFields
    }
  }
}
    ${j}
${D`
    fragment DialogActivity on Activity {
  id
  transmissionId
  performedBy {
    actorType
    actorId
    actorName
  }
  description {
    value
    languageCode
  }
  type
  createdAt
}
    `}
${D`
    fragment GuiActionFields on GuiAction {
  id
  url
  isAuthorized
  isDeleteDialogAction
  action
  authorizationAttribute
  priority
  httpMethod
  title {
    languageCode
    value
  }
  prompt {
    value
    languageCode
  }
}
    `}
${O}
${D`
    fragment TransmissionFields on Transmission {
  id
  isAuthorized
  createdAt
  type
  sender {
    actorType
    actorId
    actorName
  }
  relatedTransmissionId
  content {
    title {
      value {
        value
        languageCode
      }
      mediaType
    }
    summary {
      value {
        value
        languageCode
      }
      mediaType
    }
    contentReference {
      value {
        value
        languageCode
      }
      mediaType
    }
  }
  attachments {
    ...AttachmentFields
  }
  navigationalActions {
    ...NavigationalActionFields
  }
}
    ${j}
${D`
    fragment NavigationalActionFields on TransmissionNavigationalAction {
  title {
    value
    languageCode
  }
  url
  expiresAt
}
    `}`}
${k}`;D`
    fragment CountableDialogFields on SearchDialog {
  id
  org
  party
  contentUpdatedAt
  status
  endUserContext {
    systemLabels
  }
  seenSinceLastContentUpdate {
    isCurrentEndUser
  }
}
    `;var N=D`
    fragment dialogLookupPayload on DialogLookup {
  instanceRef
  dialogId
  serviceResource {
    id
    isDelegable
  }
}
    `,P=D`
    fragment dialogAccessInfoPayload on DialogLookup {
  instanceRef
  dialogId
  serviceResource {
    id
    name {
      value
      languageCode
    }
  }
  serviceOwner {
    code
    orgNumber
    name {
      value
      languageCode
    }
  }
  authorizationEvidence {
    viaAccessPackage
    viaResourceDelegation
    viaInstanceDelegation
    viaRole
    evidence {
      grantType
      subject
      name {
        languageCode
        value
      }
    }
  }
}
    `,F=D`
    fragment LabelAssignmentLogFields on LabelAssignmentLog {
  name
  action
  createdAt
  performedBy {
    actorId
    actorName
    actorType
  }
}
    `,I=D`
    fragment NotificationsettingForCurrentUserFields on NotificationSettingsResponse {
  emailAddress
  phoneNumber
  resourceIncludeList
  userId
  partyUuid
  emailVerificationStatus
  smsVerificationStatus
  needsConfirmation
}
    `,L=D`
    fragment OrganizationFields on Organization {
  id
  name {
    en
    nb
    nn
  }
  logo
  orgnr
  homepage
  environments
  contact {
    email
    phone
    url
  }
}
    `,R=D`
    fragment subPartyFields on AuthorizedSubParty {
  party
  partyType
  name
  isCurrentEndUser
  isDeleted
  partyUuid
  partyId
  dateOfBirth
}
    `,z=D`
    fragment partyFields on AuthorizedParty {
  party
  hasOnlyAccessToSubParties
  partyType
  subParties {
    ...subPartyFields
  }
  name
  isCurrentEndUser
  isDeleted
  partyUuid
  partyId
  dateOfBirth
}
    ${R}`,B=D`
    fragment SavedSearchesFields on SavedSearches {
  id
  name
  createdAt
  updatedAt
  data {
    urn
    searchString
    fromView
    filters {
      id
      value
    }
  }
}
    `,V=D`
    mutation AddFavoriteParty($partyId: String!) {
  addFavoriteParty(partyId: $partyId) {
    success
    message
  }
}
    `,H=D`
    mutation AddFavoritePartyToGroup($partyId: String!, $groupName: String!) {
  addFavoritePartyToGroup(partyId: $partyId, groupName: $groupName) {
    success
    message
  }
}
    `,U=D`
    mutation CreateSavedSearch($name: String!, $data: SavedSearchInput!) {
  createSavedSearch(name: $name, data: $data) {
    ...SavedSearchesFields
  }
}
    ${B}`,W=D`
    mutation DeleteFavoriteParty($partyId: String!) {
  deleteFavoriteParty(partyId: $partyId) {
    success
    message
  }
}
    `,G=D`
    mutation DeleteSavedSearch($id: Int!) {
  deleteSavedSearch(id: $id) {
    success
    message
  }
}
    `,K=D`
    query PartyUsername($partyUuid: String) {
  partyUsername(partyUuid: $partyUuid) {
    username
  }
}
    `,q=D`
    mutation SetPreSelectedParty($partyUuid: String, $operationType: String!) {
  setPreSelectedParty(partyUuid: $partyUuid, operationType: $operationType) {
    success
    message
  }
}
    `,te=D`
    mutation setShouldShowSubEntities($shouldShowDeletedEntities: Boolean!) {
  setShouldShowSubEntities(shouldShowDeletedEntities: $shouldShowDeletedEntities) {
    success
    message
  }
}
    `,J=D`
    mutation setShowClientUnits($shouldShowClientUnits: Boolean!) {
  setShowClientUnits(shouldShowClientUnits: $shouldShowClientUnits) {
    success
    message
  }
}
    `,Y=D`
    mutation SetUsername($username: String) {
  setUsername(username: $username) {
    success
    message
  }
}
    `,X=D`
    mutation UpdateLanguage($language: String!) {
  updateLanguage(language: $language) {
    success
  }
}
    `,Z=D`
    mutation UpdateNotificationSetting($data: NotificationSettingsInput!) {
  updateNotificationSetting(data: $data) {
    success
    message
  }
}
    `,Q=D`
    mutation UpdateSIPrivatePhoneNumber($value: String) {
  updateSIPrivatePhoneNumber(value: $value) {
    success
    message
  }
}
    `,ne=D`
    mutation UpdateSavedSearch($id: Int!, $name: String!) {
  updateSavedSearch(id: $id, name: $name) {
    success
    message
  }
}
    `,re=D`
    mutation verifyAddress($data: VerifyAddressInput!) {
  verifyAddress(data: $data) {
    success
    message
  }
}
    `,ie=D`
    query correspondenceForwardingCheck($correspondenceId: String!) {
  correspondenceForwardingCheck(correspondenceId: $correspondenceId) {
    allowed
    forwardingConstraint
  }
}
    `,ae=D`
    query getDialogById($id: UUID!) {
  dialogById(dialogId: $id) {
    dialog {
      ...DialogByIdFields
    }
    errors {
      __typename
      message
    }
  }
}
    ${M}`,oe=D`
    query dialogLookup($instanceRef: String!) {
  dialogLookup(instanceRef: $instanceRef) {
    lookup {
      ...dialogLookupPayload
    }
    errors {
      message
    }
  }
}
    ${N}`,se=D`
    query dialogAccessInfo($instanceRef: String!) {
  dialogLookup(instanceRef: $instanceRef) {
    lookup {
      ...dialogAccessInfoPayload
    }
    errors {
      message
    }
  }
}
    ${P}`,ce=D`
    query getAllDialogsForParties($partyURIs: [String!], $search: String, $org: [String!], $status: [DialogStatus!], $continuationToken: String, $limit: Int, $label: [SystemLabel!], $updatedAfter: DateTime, $updatedBefore: DateTime, $searchLanguageCode: String, $serviceResources: [String!], $isContentSeen: Boolean) {
  searchDialogs(
    input: {party: $partyURIs, search: $search, org: $org, status: $status, continuationToken: $continuationToken, orderBy: {createdAt: null, updatedAt: null, dueAt: null, contentUpdatedAt: DESC}, systemLabel: $label, contentUpdatedAfter: $updatedAfter, contentUpdatedBefore: $updatedBefore, limit: $limit, excludeApiOnly: true, searchLanguageCode: $searchLanguageCode, serviceResource: $serviceResources, isContentSeen: $isContentSeen}
  ) {
    items {
      ...SearchDialogFields
    }
    hasNextPage
    continuationToken
  }
}
    ${A}`,le=D`
    query getFilterServiceResources($lang: String) {
  serviceResources: DPServiceResourcesList(lang: $lang) {
    id
    title
    org
  }
}
    `,ue=D`
    mutation forwardCorrespondence($correspondenceId: String!, $dialogToken: String!, $forwardTo: String!, $forwardingText: String, $includeAttachments: Boolean!) {
  forwardCorrespondence(
    correspondenceId: $correspondenceId
    dialogToken: $dialogToken
    forwardTo: $forwardTo
    forwardingText: $forwardingText
    includeAttachments: $includeAttachments
  ) {
    success
    status
    errorCode
  }
}
    `,de=D`
    query labelAssignmentLog($dialogId: UUID!) {
  labelAssignmentLog(dialogId: $dialogId) {
    labelAssignmentLog {
      ...LabelAssignmentLogFields
    }
    errors {
      __typename
      message
    }
  }
}
    ${F}`,fe=D`
    query getNotificationAddressByOrgNumber($orgnr: String!) {
  getNotificationAddressByOrgNumber(orgnr: $orgnr) {
    organizationNumber
    status
    notificationAddresses {
      countryCode
      email
      phone
      notificationAddressId
    }
  }
}
    `,pe=D`
    query notificationLogs($dialogId: String!) {
  notificationLogs(dialogId: $dialogId) {
    notificationId
    dialogId
    transmissionId
    type
    channel
    destination
    status
    requestedSendTime
    lastUpdateTime
  }
}
    `,$=D`
    query notificationsettingsForCurrentUser {
  notificationsettingsForCurrentUser {
    ...NotificationsettingForCurrentUserFields
  }
}
    ${I}`,me=D`
    query organizations {
  organizations {
    ...OrganizationFields
  }
}
    ${L}`,he=D`
    query parties {
  parties {
    ...partyFields
    subParties {
      ...subPartyFields
    }
  }
}
    ${z}
${R}`,ge=D`
    query profile {
  profile {
    updatedAt
    language
    groups {
      id
      name
      isFavorite
      parties
    }
    user {
      userId
      userUuid
      userName
      email
      isReserved
      phoneNumber
      externalIdentity
      partyId
      party {
        partyId
        partyUuid
        partyTypeName
        orgNumber
        ssn
        unitType
        name
        isDeleted
        onlyHierarchyElementWithNoAccess
        person {
          ssn
          name
          firstName
          middleName
          lastName
          telephoneNumber
          mobileNumber
          mailingAddress
          mailingPostalCode
          mailingPostalCity
          addressMunicipalNumber
          addressMunicipalName
          addressStreetName
          addressHouseNumber
          addressHouseLetter
          addressPostalCode
          addressCity
          dateOfDeath
        }
      }
      profileSettingPreference {
        shouldShowDeletedEntities
        showClientUnits
        preselectedPartyUuid
        doNotPromptForParty
      }
    }
  }
}
    `,_e=D`
    query savedSearches {
  savedSearches {
    ...SavedSearchesFields
  }
}
    ${B}`,ve=D`
    mutation SendVerificationCode($data: SendVerificationCodeInput!) {
  sendVerificationCode(data: $data) {
    success
    message
    retryAfter
  }
}
    `,ye=D`
    query getServiceResources($ids: [String!], $resourceType: [String], $org: [String], $lang: String) {
  serviceResources: RRServiceResourcesList(
    resourceType: $resourceType
    ids: $ids
    org: $org
    lang: $lang
  ) {
    id
    title
    org
    deprecated
  }
}
    `,be=D`
    mutation updateSystemLabel($dialogId: UUID!, $addLabels: [SystemLabel!]!, $removeLabels: [SystemLabel!]!) {
  setSystemLabel(
    input: {dialogId: $dialogId, addLabels: $addLabels, removeLabels: $removeLabels}
  ) {
    success
  }
}
    `,xe=D`
    mutation bulkUpdateSystemLabels($dialogs: [DialogRevisionInput!]!, $addLabels: [SystemLabel!]!, $removeLabels: [SystemLabel!]!) {
  bulkSetSystemLabels(
    input: {dialogs: $dialogs, addLabels: $addLabels, removeLabels: $removeLabels}
  ) {
    success
  }
}
    `,Se=D`
    query verifiedAddresses {
  verifiedAddresses {
    value
    addressType
  }
}
    `,Ce=(e,t,n,r)=>e();function we(e,t=Ce){return{AddFavoriteParty(n,r,i){return t(t=>e.request({document:V,variables:n,requestHeaders:{...r,...t},signal:i}),`AddFavoriteParty`,`mutation`,n)},AddFavoritePartyToGroup(n,r,i){return t(t=>e.request({document:H,variables:n,requestHeaders:{...r,...t},signal:i}),`AddFavoritePartyToGroup`,`mutation`,n)},CreateSavedSearch(n,r,i){return t(t=>e.request({document:U,variables:n,requestHeaders:{...r,...t},signal:i}),`CreateSavedSearch`,`mutation`,n)},DeleteFavoriteParty(n,r,i){return t(t=>e.request({document:W,variables:n,requestHeaders:{...r,...t},signal:i}),`DeleteFavoriteParty`,`mutation`,n)},DeleteSavedSearch(n,r,i){return t(t=>e.request({document:G,variables:n,requestHeaders:{...r,...t},signal:i}),`DeleteSavedSearch`,`mutation`,n)},PartyUsername(n,r,i){return t(t=>e.request({document:K,variables:n,requestHeaders:{...r,...t},signal:i}),`PartyUsername`,`query`,n)},SetPreSelectedParty(n,r,i){return t(t=>e.request({document:q,variables:n,requestHeaders:{...r,...t},signal:i}),`SetPreSelectedParty`,`mutation`,n)},setShouldShowSubEntities(n,r,i){return t(t=>e.request({document:te,variables:n,requestHeaders:{...r,...t},signal:i}),`setShouldShowSubEntities`,`mutation`,n)},setShowClientUnits(n,r,i){return t(t=>e.request({document:J,variables:n,requestHeaders:{...r,...t},signal:i}),`setShowClientUnits`,`mutation`,n)},SetUsername(n,r,i){return t(t=>e.request({document:Y,variables:n,requestHeaders:{...r,...t},signal:i}),`SetUsername`,`mutation`,n)},UpdateLanguage(n,r,i){return t(t=>e.request({document:X,variables:n,requestHeaders:{...r,...t},signal:i}),`UpdateLanguage`,`mutation`,n)},UpdateNotificationSetting(n,r,i){return t(t=>e.request({document:Z,variables:n,requestHeaders:{...r,...t},signal:i}),`UpdateNotificationSetting`,`mutation`,n)},UpdateSIPrivatePhoneNumber(n,r,i){return t(t=>e.request({document:Q,variables:n,requestHeaders:{...r,...t},signal:i}),`UpdateSIPrivatePhoneNumber`,`mutation`,n)},UpdateSavedSearch(n,r,i){return t(t=>e.request({document:ne,variables:n,requestHeaders:{...r,...t},signal:i}),`UpdateSavedSearch`,`mutation`,n)},verifyAddress(n,r,i){return t(t=>e.request({document:re,variables:n,requestHeaders:{...r,...t},signal:i}),`verifyAddress`,`mutation`,n)},correspondenceForwardingCheck(n,r,i){return t(t=>e.request({document:ie,variables:n,requestHeaders:{...r,...t},signal:i}),`correspondenceForwardingCheck`,`query`,n)},getDialogById(n,r,i){return t(t=>e.request({document:ae,variables:n,requestHeaders:{...r,...t},signal:i}),`getDialogById`,`query`,n)},dialogLookup(n,r,i){return t(t=>e.request({document:oe,variables:n,requestHeaders:{...r,...t},signal:i}),`dialogLookup`,`query`,n)},dialogAccessInfo(n,r,i){return t(t=>e.request({document:se,variables:n,requestHeaders:{...r,...t},signal:i}),`dialogAccessInfo`,`query`,n)},getAllDialogsForParties(n,r,i){return t(t=>e.request({document:ce,variables:n,requestHeaders:{...r,...t},signal:i}),`getAllDialogsForParties`,`query`,n)},getFilterServiceResources(n,r,i){return t(t=>e.request({document:le,variables:n,requestHeaders:{...r,...t},signal:i}),`getFilterServiceResources`,`query`,n)},forwardCorrespondence(n,r,i){return t(t=>e.request({document:ue,variables:n,requestHeaders:{...r,...t},signal:i}),`forwardCorrespondence`,`mutation`,n)},labelAssignmentLog(n,r,i){return t(t=>e.request({document:de,variables:n,requestHeaders:{...r,...t},signal:i}),`labelAssignmentLog`,`query`,n)},getNotificationAddressByOrgNumber(n,r,i){return t(t=>e.request({document:fe,variables:n,requestHeaders:{...r,...t},signal:i}),`getNotificationAddressByOrgNumber`,`query`,n)},notificationLogs(n,r,i){return t(t=>e.request({document:pe,variables:n,requestHeaders:{...r,...t},signal:i}),`notificationLogs`,`query`,n)},notificationsettingsForCurrentUser(n,r,i){return t(t=>e.request({document:$,variables:n,requestHeaders:{...r,...t},signal:i}),`notificationsettingsForCurrentUser`,`query`,n)},organizations(n,r,i){return t(t=>e.request({document:me,variables:n,requestHeaders:{...r,...t},signal:i}),`organizations`,`query`,n)},parties(n,r,i){return t(t=>e.request({document:he,variables:n,requestHeaders:{...r,...t},signal:i}),`parties`,`query`,n)},profile(n,r,i){return t(t=>e.request({document:ge,variables:n,requestHeaders:{...r,...t},signal:i}),`profile`,`query`,n)},savedSearches(n,r,i){return t(t=>e.request({document:_e,variables:n,requestHeaders:{...r,...t},signal:i}),`savedSearches`,`query`,n)},SendVerificationCode(n,r,i){return t(t=>e.request({document:ve,variables:n,requestHeaders:{...r,...t},signal:i}),`SendVerificationCode`,`mutation`,n)},getServiceResources(n,r,i){return t(t=>e.request({document:ye,variables:n,requestHeaders:{...r,...t},signal:i}),`getServiceResources`,`query`,n)},updateSystemLabel(n,r,i){return t(t=>e.request({document:be,variables:n,requestHeaders:{...r,...t},signal:i}),`updateSystemLabel`,`mutation`,n)},bulkUpdateSystemLabels(n,r,i){return t(t=>e.request({document:xe,variables:n,requestHeaders:{...r,...t},signal:i}),`bulkUpdateSystemLabels`,`mutation`,n)},verifiedAddresses(n,r,i){return t(t=>e.request({document:Se,variables:n,requestHeaders:{...r,...t},signal:i}),`verifiedAddresses`,`query`,n)}}}export{i as a,s as c,u as d,d as f,r as i,c as l,t as n,a as o,n as r,o as s,we as t,l as u};