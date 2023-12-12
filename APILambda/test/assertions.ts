// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const withEmptyResponseBody = (resp: any) => {
  return ({ ...resp, body: resp.body === "" || (Object.keys(resp.body).length === 0 && resp.body.constructor === Object) ? "" : resp.body })
}
