const jwt = require("jsonwebtoken");

function instructorAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Yetkisiz erişim: token eksik" });
  }
  const token = header.replace("Bearer ", "");
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== "instructor") {
      return res.status(403).json({ message: "Bu işlem için öğretim üyesi yetkisi gerekli" });
    }
    req.instructor = { id: payload.id, email: payload.email, department: payload.department };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Yetkisiz erişim: geçersiz token" });
  }
}

module.exports = instructorAuth;
