const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pw0rah1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const articlesCollection = client
      .db("knowvia_Admin")
      .collection("articles");
    const commentsCollection = client
      .db("knowvia_Admin")
      .collection("comments");

    //  articles related APIs start here
    app.post("/articles", async (req, res) => {
      try {
        const article = req.body;

        const result = await articlesCollection.insertOne(article);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error saving article:", error);
        res.status(500).send({ message: "Failed to save article" });
      }
    });

    // category filter
    app.get("/articles", async (req, res) => {
      try {
        const { category } = req.query;
        let query = {};
        if (category) {
          const escapedCategory = category.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );
          query.category = { $regex: new RegExp(`^${escapedCategory}$`, "i") };
        }

        const articles = await articlesCollection.find(query).toArray();
        console.log("Articles found:", articles.length);
        res.status(200).send(articles);
      } catch (error) {
        console.error("Error fetching articles:", error);
        res.status(500).send({ message: "Failed to fetch articles" });
      }
    });

    // Get single article by ID
    app.get("/articles/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const article = await articlesCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!article) {
          return res.status(404).send({ message: "Article not found" });
        }

        res.send(article);
      } catch (error) {
        console.error("Error fetching article by ID:", error);
        res.status(500).send({ message: "Failed to fetch article" });
      }
    });
    app.patch("/articles/:id", async (req, res) => {
      const { id } = req.params;
      const updatedData = req.body;

      try {
        const result = await articlesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );
        res.send(result);
      } catch (err) {
        console.error("Failed to update article", err);
        res.status(500).send({ message: "Update failed" });
      }
    });
    app.delete("/articles/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const result = await articlesCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (err) {
        console.error("Failed to delete article", err);
        res.status(500).send({ message: "Deletion failed" });
      }
    });

    // handle like toggle start here
    app.patch("/like/:articleId", async (req, res) => {
      const id = req.params.articleId;
      const email = req.body.email;

      try {
        const filter = { _id: new ObjectId(id) };
        const article = await articlesCollection.findOne(filter);

        if (!article) {
          return res.status(404).send({ message: "Article not found" });
        }

        const alreadyLiked = article.likedBy?.includes(email);

        const updateDoc = alreadyLiked
          ? { $pull: { likedBy: email } }
          : { $addToSet: { likedBy: email } };

        await articlesCollection.updateOne(filter, updateDoc);

        res.send({
          message: alreadyLiked ? "Dislike Successful" : "Like Successful",
          liked: !alreadyLiked,
        });
      } catch (error) {
        console.error("Error toggling like:", error);
        res.status(500).send({ message: "Failed to toggle like" });
      }
    });
    // handle like toggle end here

    // comments related APIs start here
    app.post("/articles/:id/comments", async (req, res) => {
      const { id } = req.params;
      const comment = req.body;

      const newComment = {
        article_id: new ObjectId(id),
        user_id: comment.user_id,
        user_name: comment.user_name,
        user_photo: comment.user_photo,
        comment: comment.comment,
        created_at: new Date(),
      };

      try {
        const result = await commentsCollection.insertOne(newComment);
        res.status(201).send(result);
      } catch (err) {
        console.error("Error saving comment:", err);
        res.status(500).send({ message: "Failed to save comment" });
      }
    });

    app.get("/comments/recent", async (req, res) => {
      try {
        const recentComments = await commentsCollection
          .find({})
          .sort({ created_at: -1 })
          .limit(10)
          .toArray();
        const withArticleId = recentComments.map((comment) => ({
          ...comment,
          articleId: comment.article_id?.toString(),
        }));

        res.send(withArticleId);
      } catch (error) {
        console.error("Error fetching recent comments:", error);
        res.status(500).send({ message: "Failed to fetch recent comments" });
      }
    });

    app.get("/comments/:articleId", async (req, res) => {
      try {
        const id = req.params.articleId;

        const article = await articlesCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!article) {
          return res.status(404).send({ message: "Article not found" });
        }

        const comments = await commentsCollection
          .find({ article_id: new ObjectId(id) })
          .sort({ created_at: -1 })
          .toArray();

        res.send(comments);
      } catch (error) {
        console.error("Error fetching article with comments:", error);
        res.status(500).send({ message: "Failed to fetch article" });
      }
    });
    // comments related APIs end here

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Knowvia server is running:");
});

app.listen(port, (req, res) => {
  console.log(`Knowvia is running on port: ${port}`);
});
