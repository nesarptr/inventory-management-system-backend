const { validationResult } = require("express-validator");

const Throw = require("../utils/throw");
const User = require("../models/user");
const Product = require("../models/product");
const { checkAuthorizedAndNotEmpty } = require("../utils/auth-non-empty-check");
const { productBody: extractProductBody } = require("../utils/extract");
const send = require("../utils/send");

exports.addNewProduct = async (req, res, _) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    Throw.ValidationError(errors.array()[0].msg);
  }
  const email = req.email;
  const body = req.body;
  body.userId = req.userId;
  const prods = body.products;
  let message;
  let data;
  if (!prods) {
    const product = new Product(extractProductBody(body));
    await product.save();
    message = "successfully product is created";
    data = product;
    send.productCreatedConfirmationMail(email, product._id.toString());
  } else {
    const products = [];
    const productData = prods.map((p) =>
      new Product(extractProductBody(p)).save()
    );
    for await (const prod of productData) {
      send.productCreatedConfirmationMail(email, prod._id.toString());
      products.push(prod);
    }
    message = "successfully products are created";
    data = products;
  }
  res.status(201).json({
    message,
    data,
  });
};

exports.getAllProducts = async ({ userId }, res, _) => {
  const products = (await Product.find({ owner: userId })).map(
    (product) => product
  );
  if (!products) {
    Throw.NotFoundError("Product Not Fount");
  }
  res.status(200).json({
    message: "all data successfully retrived",
    data: products,
  });
};

exports.editProduct = async (req, res, _) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    Throw.ValidationError(errors.array()[0].msg);
  }
  const params = req.params;
  const body = req.body;
  const userId = req.userId;
  body.userId = userId;
  const prodId = params.id;
  const product = await Product.findById(prodId);

  checkAuthorizedAndNotEmpty(product, userId);

  product.name = body.name;
  product.price = body.price;
  product.imgURL = body.imgURL || product.imgURL;
  product.description = body.description;
  await product.save();
  res.status(200).json(product);
};

exports.deleteProduct = async ({ params, userId }, res, _) => {
  const prodId = params.id;
  const product = await Product.findById(prodId);
  checkAuthorizedAndNotEmpty(product, userId);
  const user = await User.findById(userId);
  const deleteData = await product.remove();
  user.products = user.products.filter((p) => p._id !== deleteData._id);
  await user.save();
  res.status(200).json({
    message: "Delete Operation Successfull",
    deleteData,
  });
};
