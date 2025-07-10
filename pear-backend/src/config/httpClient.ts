import https from "https"
import fs from "fs"
import path from "path"

export const httpsAgent = new https.Agent({
  cert: fs.readFileSync('/etc/nginx/client-certs/pear-company-client.crt'),
  key: fs.readFileSync('/etc/nginx/client-certs/pear-company-client.key'),
  rejectUnauthorized: false,
})
