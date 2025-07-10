import https from "https"
import fs from "fs"
import path from "path"

export const httpsAgent = new https.Agent({
  cert: fs.readFileSync(
    path.resolve(
      process.env.CLIENT_CERT_PATH === undefined ? "./certs/pear-company-client.crt" : process.env.CLIENT_CERT_PATH,
    ),
  ),
  key: fs.readFileSync(
    path.resolve(
      process.env.CLIENT_KEY_PATH === undefined ? "./certs/pear-company-client.key" : process.env.CLIENT_KEY_PATH,
    ),
  ),
  rejectUnauthorized: false,
})
