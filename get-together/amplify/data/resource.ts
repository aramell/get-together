import { defineData } from '@aws-amplify/backend'

const schema = `
    type User @model @auth(rules: [{ allow: owner }]) {
      id: ID!
      email: AWSEmail!
      displayName: String
      avatarUrl: AWSURL
      timezone: String
      notificationPreferences: AWSJSON
      version: Int!
    }

    type Group @model @auth(rules: [{ allow: owner }, { allow: private }]) {
      id: ID!
      name: String!
      description: String
      inviteCode: String!
      ownerId: ID!
      isPublic: Boolean
      maxMembers: Int
      members: [GroupMembership] @hasMany(references: ["groupId"])
      events: [Event] @hasMany(references: ["groupId"])
      availabilities: [Availability] @hasMany(references: ["groupId"])
      wishlistItems: [WishlistItem] @hasMany(references: ["groupId"])
      version: Int!
    }

    type GroupMembership @model @auth(rules: [{ allow: owner }]) {
      id: ID!
      userId: ID!
      groupId: ID!
      group: Group @belongsTo(references: ["groupId"])
      isAdmin: Boolean
      joinedAt: AWSDateTime
      lastActivityAt: AWSDateTime
      version: Int!
    }

    type Event @model @auth(rules: [{ allow: owner }]) {
      id: ID!
      groupId: ID!
      group: Group @belongsTo(references: ["groupId"])
      creatorId: ID!
      title: String!
      description: String
      dateRangeStart: AWSDate!
      dateRangeEnd: AWSDate!
      thresholdInCount: Int
      finalizedDate: AWSDate
      status: String
      rsvpInCount: Int
      rsvpMaybeCount: Int
      rsvpOutCount: Int
      rsvps: [RSVP] @hasMany(references: ["eventId"])
      comments: [Comment] @hasMany(references: ["eventId"])
      version: Int!
    }

    type RSVP @model @auth(rules: [{ allow: owner }]) {
      id: ID!
      eventId: ID!
      event: Event @belongsTo(references: ["eventId"])
      userId: ID!
      status: String!
      version: Int!
    }

    type Availability @model @auth(rules: [{ allow: owner }]) {
      id: ID!
      groupId: ID!
      group: Group @belongsTo(references: ["groupId"])
      userId: ID!
      dayOfWeek: Int!
      startTime: AWSTime!
      endTime: AWSTime!
      isFree: Boolean!
      recurrsWeekly: Boolean
      expiresAt: AWSDateTime
      version: Int!
    }

    type WishlistItem @model @auth(rules: [{ allow: owner }]) {
      id: ID!
      groupId: ID!
      group: Group @belongsTo(references: ["groupId"])
      creatorId: ID!
      title: String!
      description: String
      imageUrl: AWSURL
      linkUrl: AWSURL
      category: String
      interestCount: Int
      convertedToEventId: ID
      interests: [WishlistInterest] @hasMany(references: ["wishlistItemId"])
      comments: [Comment] @hasMany(references: ["wishlistItemId"])
      version: Int!
    }

    type WishlistInterest @model @auth(rules: [{ allow: owner }]) {
      id: ID!
      wishlistItemId: ID!
      wishlistItem: WishlistItem @belongsTo(references: ["wishlistItemId"])
      userId: ID!
      version: Int!
    }

    type Comment @model @auth(rules: [{ allow: owner }]) {
      id: ID!
      creatorId: ID!
      content: String!
      eventId: ID
      event: Event @belongsTo(references: ["eventId"])
      wishlistItemId: ID
      wishlistItem: WishlistItem @belongsTo(references: ["wishlistItemId"])
      version: Int!
    }
`

export const data = defineData({
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
  schema
})
