const express = require("express");
const { dynamoDB } = require("./src/config/dynamo") // adjust path if needed

const {
  ListTablesCommand,
} = require("@aws-sdk/client-dynamodb");

const app = express();
const PORT = 3000;

/**
 * Dummy test route
 * URL: http://localhost:3000/test-dynamo
 */
app.get("/test-dynamo", async (req, res) => {
  try {
    // List all DynamoDB tables
    const command = new ListTablesCommand({});
    const response = await dynamoDB.send(command);

    console.log("✅ DynamoDB Connected Successfully");
    console.log("📋 Tables:", response.TableNames);

    res.status(200).json({
      success: true,
      message: "DynamoDB connected successfully",
      tables: response.TableNames,
    });
  } catch (error) {
    console.error("❌ DynamoDB connection failed:", error);

    res.status(500).json({
      success: false,
      message: "DynamoDB connection failed",
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
