const express = require("express");
const app = express();
const os = require("os");
const speedTest = require("speedtest-net");
const batteryLevel = require("battery-level");
const port = 3000;

let cachedIpAddress = null;

const fetchIpAddress = () => {
  return new Promise((resolve, reject) => {
    if (cachedIpAddress) {
      resolve(cachedIpAddress);
    } else {
      const ipAddress = Object.values(os.networkInterfaces())
        .flat()
        .filter(({ family, internal }) => family === "IPv4" && !internal)
        .map(({ address }) => address)[0];
      if (ipAddress) {
        cachedIpAddress = ipAddress;
        resolve(ipAddress);
      } else {
        reject("Failed to fetch IP address");
      }
    }
  });
};

const runSpeedTest = () => {
  return new Promise((resolve, reject) => {
    speedTest({ acceptLicense: true })
      .then((data) => resolve(data))
      .catch((error) => reject(error));
  });
};

// app.get("/speed-ip-battery-finder", async (req, res) => {
//   try {
//     // Fetch IP address (cached)
//     const ipAddress = await fetchIpAddress();

//     // Perform speed test and fetch battery level concurrently
//     const [speed, batteryPercentage] = await Promise.all([
//       runSpeedTest(),
//       batteryLevel().then((level) => level * 100),
//     ]);

//     const downloadSpeedMbps = speed.download.bandwidth / 1000000; // Convert from bps to Mbps
//     const uploadSpeedMbps = speed.upload.bandwidth / 1000000; // Convert from bps to Mbps

//     // Get system information
//     const systemInfo = {
//       operating_system: os.type(),
//       browser: req.headers["user-agent"],
//     };

//     res.json({
//       ip_address: ipAddress,
//       download_speed: downloadSpeedMbps,
//       upload_speed: uploadSpeedMbps,
//       battery_percentage: batteryPercentage,
//       system_info: systemInfo,
//     });
//   } catch (error) {
//     console.error("Error:", error);
//     res.status(500).json({
//       error:
//         "An error occurred while fetching speed, IP, battery, and system information.",
//     });
//   }
// });

const cache = {};

app.get("/speed-ip-battery-finder", async (req, res) => {
  try {
    const cachedResult = cache[req.ip];
    if (cachedResult) {
      return res.json(cachedResult);
    }

    const ipAddress = await fetchIpAddress();
    const [speed, batteryPercentage] = await Promise.all([
      runSpeedTest(),
      batteryLevel().then((level) => level * 100),
    ]);

    const downloadSpeedMbps = speed.download.bandwidth / 1000000; // Convert from bps to Mbps
    const uploadSpeedMbps = speed.upload.bandwidth / 1000000; // Convert from bps to Mbps

    const systemInfo = {
      operating_system: os.type(),
      browser: req.headers["user-agent"],
    };

    const result = {
      ip_address: ipAddress,
      download_speed: downloadSpeedMbps,
      upload_speed: uploadSpeedMbps,
      battery_percentage: batteryPercentage,
      system_info: systemInfo,
    };

    cache[req.ip] = result;

    res.json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error:
        "An error occurred while fetching speed, IP, battery, and system information.",
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
