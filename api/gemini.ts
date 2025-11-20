
// This API route is disabled as the chat feature has been removed.
export default async function handler(req: any, res: any) {
  return res.status(200).json({ message: "Feature disabled" });
}
