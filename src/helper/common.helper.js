const context = (req) => ({
  requestId: req.requestId,
  practiceId: req.practiceId,
});

export { context };