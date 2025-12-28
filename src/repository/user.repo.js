const {
  GetCommand,
  PutCommand,
  ScanCommand,
  DeleteCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const { v4: uuidv4 } = require("uuid");
const { dynamoDB } = require("../config/dynamo");

const TABLE_NAME = "cancellation_app_users";

/* =========================
   USER QUERIES (UNCHANGED)
========================= */

const findUserById = async (id) => {
  if (!id || typeof id !== "string") return null;

  const params = {
    TableName: TABLE_NAME,
    Key: { _id: id },
  };

  const response = await dynamoDB.send(new GetCommand(params));
  return response.Item || null;
};

const findUserByEmail = async (email) => {
  const params = {
    TableName: TABLE_NAME,
    FilterExpression: "email = :email",
    ExpressionAttributeValues: { ":email": email },
  };

  const response = await dynamoDB.send(new ScanCommand(params));
  return response.Items?.[0] || null;
};

const createUser = async (userData) => {
  const newUser = {
    _id: uuidv4(),
    createdAt: new Date().toISOString(),
    activeToken: null, // 🔐 important for logout system
    ...userData,
  };

  const params = {
    TableName: TABLE_NAME,
    Item: newUser,
    ConditionExpression: "attribute_not_exists(#id)",
    ExpressionAttributeNames: { "#id": "_id" },
  };

  await dynamoDB.send(new PutCommand(params));
  return newUser;
};

const getAllNonAdminUsers = async () => {
  const params = {
    TableName: TABLE_NAME,
    FilterExpression: "#r <> :admin",
    ExpressionAttributeNames: { "#r": "role" },
    ExpressionAttributeValues: { ":admin": "admin" },
  };

  const response = await dynamoDB.send(new ScanCommand(params));

  return response.Items.map(({ password, activeToken, ...u }) => u);
};

const deleteUserByIdAndEmail = async (id, email) => {
  const params = {
    TableName: TABLE_NAME,
    Key: { _id: id },
    ConditionExpression: "email = :email",
    ExpressionAttributeValues: { ":email": email },
  };

  try {
    await dynamoDB.send(new DeleteCommand(params));
    return true;
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") return false;
    throw err;
  }
};

/* =========================
   🔐 AUTH SESSION FUNCTIONS
========================= */

/**
 * Save / Replace active token (on login)
 */
const setActiveToken = async (userId, token) => {
  const params = {
    TableName: TABLE_NAME,
    Key: { _id: userId },
    UpdateExpression: "SET activeToken = :token",
    ExpressionAttributeValues: {
      ":token": token,
    },
  };

  await dynamoDB.send(new UpdateCommand(params));
};

/**
 * Remove token (on logout)
 */
const clearActiveToken = async (userId) => {
  const params = {
    TableName: TABLE_NAME,
    Key: { _id: userId },
    UpdateExpression: "REMOVE activeToken",
  };

  await dynamoDB.send(new UpdateCommand(params));
};

/**
 * Validate token (used by authMiddleware)
 */
const isTokenValidForUser = (user, token) => {
  return user?.activeToken === token;
};

module.exports = {
  findUserById,
  findUserByEmail,
  createUser,
  getAllNonAdminUsers,
  deleteUserByIdAndEmail,

  // 🔐 auth helpers
  setActiveToken,
  clearActiveToken,
  isTokenValidForUser,
};
