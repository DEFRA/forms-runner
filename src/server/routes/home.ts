export default {
  method: "GET",
  path: "/",
  handler: (_request, h) => {
    return h.view('home');
  }
};
