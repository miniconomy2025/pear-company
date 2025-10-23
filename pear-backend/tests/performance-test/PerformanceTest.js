import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  thresholds: {
    // Assert that 99% of requests finish within 2s.
    http_req_duration: ["p(99) < 2000"],

    // require at least 95% of checks to pass
    checks: ["rate>0.95"], 
  },
  // Ramp the number of virtual users up and down - we gotta change this to higher numbers at a later stage
  stages: [
    { duration: "10s", target: 15 },
    { duration: "10s", target: 15 },
    { duration: "10s", target: 0 },
  ],
};


const APIEndpoints = [
  "/internal-api/reports/sales",
  "/internal-api/reports/logistics/bulk",
  "/internal-api/reports/logistics/consumer",
  "/internal-api/reports/logistics/consumer/pending",
  "/internal-api/reports/inventory",
  "/internal-api/reports/financial",
  "/internal-api/reports/production",
  "/public-api/stock",
];

export default function () {
  const requests = APIEndpoints.map((e) => [`GET`, `${"https://pear-api.duckdns.org"}${e}`]);
  const responses = http.batch(requests);

  responses.forEach((res, i) => {
    check(res, { [`${APIEndpoints[i]} status was 200`]: (r) => r.status === 200 }),
    check(res, { [`${APIEndpoints[i]} response time < 1s`]: (r) => r.timings.duration < 1000 })
  });

  sleep(Math.random() * 2 + 1); // between 1–3 seconds to simulate user behaviour
}