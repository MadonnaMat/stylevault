// Forwards /api to the Nest API during `ng serve`. API_PORT lets the e2e stack use its own port.
export default {
  '/api': {
    target: `http://localhost:${process.env.API_PORT ?? 3000}`,
    secure: false,
  },
};
