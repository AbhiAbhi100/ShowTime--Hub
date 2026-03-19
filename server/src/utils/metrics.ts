
// Metrics removed for simplification
const register = {
  contentType: "text/plain",
  metrics: async () => "",
};
export const httpRequestDurationMicroseconds = {
  labels: () => ({ observe: () => {} }),
};
export default register;
