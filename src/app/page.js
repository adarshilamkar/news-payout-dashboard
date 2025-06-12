"use client";

import React, { useState, useEffect, useContext, createContext } from "react";
import Head from "next/head";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import axios from "axios";
import { jsPDF } from "jspdf";
import Papa from "papaparse";
import { Bar, Pie } from "react-chartjs-2";
import Chart from "chart.js/auto";
import "bootstrap/dist/css/bootstrap.min.css";

// Firebase config - Replace these values with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBoiCE1Df2JwSSXWji0HLuMfWgFTLX5oUM",
  authDomain: "news-dashboard-c6c50.firebaseapp.com",
  projectId: "news-dashboard-c6c50",
  storageBucket: "news-dashboard-c6c50.firebasestorage.app",
  messagingSenderId: "313103915375",
  appId: "1:313103915375:web:da7129b6d0812abdb4f09a",
  measurementId: "G-LMVSYNWL75"
};


// Initialize Firebase once
if (!getApps().length) {
  initializeApp(firebaseConfig);
}
const auth = getAuth();
const googleProvider = new GoogleAuthProvider();

// Admin emails list (replace with your admin emails)
const ADMIN_EMAILS = ["admin@example.com","admin2@example.com","ilamkaradarsh@gmail.com"];

// Context for Auth
const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingUser(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loadingUser }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  return useContext(AuthContext);
}

export default function Home() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}

function UnifiedAuthForm({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("Login successful");
      onLoginSuccess();
      setEmail("");
      setPassword("");
    } catch (err) {
      alert("Login error: " + err.message);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert("Sign-up successful! You can now log in.");
      setIsLogin(true);
      setEmail("");
      setPassword("");
    } catch (err) {
      alert("Sign-up error: " + err.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      alert("Google login successful");
      onLoginSuccess();
    } catch (err) {
      alert("Google login error: " + err.message);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-6">
        <div className="card p-4 shadow-sm">
          <h2 className="mb-3 text-center">{isLogin ? "Login" : "Sign Up"}</h2>
          <form onSubmit={isLogin ? handleLogin : handleSignUp}>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">
                Email address
              </label>
              <input
                type="email"
                id="email"
                className="form-control"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby="emailHelp"
              />
            </div>
            <div className="mb-3">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                type="password"
                id="password"
                className="form-control"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className={`btn btn-${isLogin ? "primary" : "success"} w-100`}
            >
              {isLogin ? "Login" : "Sign Up"}
            </button>
          </form>

          <div className="text-center my-3">
            <span>
              {isLogin ? "New user? " : "Already have an account? "}
            </span>
            <button
              type="button"
              className="btn btn-link p-0"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Sign Up" : "Login"}
            </button>
          </div>

          <hr />
          <button
            onClick={handleGoogleLogin}
            type="button"
            className="btn btn-danger w-100"
          >
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { user, loadingUser } = useAuth();

  const [news, setNews] = useState([]);
  const [filteredNews, setFilteredNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [errorNews, setErrorNews] = useState(null);
  const [search, setSearch] = useState("");
  const [filterAuthor, setFilterAuthor] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [payoutRates, setPayoutRates] = useState({});
  const [darkMode, setDarkMode] = useState(false);

  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  const NEWS_API_KEY = "7292d77703c840e6969498a51b58984d"; // Replace with your NewsAPI Key

  const fetchNews = async () => {
    setLoadingNews(true);
    setErrorNews(null);
    try {
      const response = await axios.get(
        `https://newsapi.org/v2/top-headlines?country=us&apiKey=${NEWS_API_KEY}`
      );
      if (response.data.articles) {
        const articles = response.data.articles.map((article, index) => ({
          id: index,
          author: article.author || "Unknown",
          title: article.title,
          description: article.description,
          url: article.url,
          urlToImage: article.urlToImage,
          publishedAt: article.publishedAt,
          source: article.source.name,
          type: article.source.name.toLowerCase().includes("opinion")
            ? "blog"
            : "news",
        }));
        setNews(articles);
        setFilteredNews(articles);
      } else {
        setErrorNews("No articles found");
      }
    } catch (err) {
      setErrorNews("Failed to fetch news: " + err.message);
    } finally {
      setLoadingNews(false);
    }
  };

  useEffect(() => {
    fetchNews();

    const storedRates = localStorage.getItem("payoutRates");
    if (storedRates) setPayoutRates(JSON.parse(storedRates));

    const storedDark = localStorage.getItem("darkMode");
    if (storedDark) setDarkMode(storedDark === "true");
  }, []);

  useEffect(() => {
    if (isAdmin) localStorage.setItem("payoutRates", JSON.stringify(payoutRates));
  }, [payoutRates, isAdmin]);

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    let filtered = [...news];

    if (search.trim() !== "") {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title?.toLowerCase().includes(s) ||
          a.description?.toLowerCase().includes(s)
      );
    }
    if (filterAuthor.trim() !== "") {
      filtered = filtered.filter((a) =>
        a.author.toLowerCase().includes(filterAuthor.toLowerCase())
      );
    }
    if (filterType !== "") {
      filtered = filtered.filter((a) => a.type === filterType);
    }
    if (filterStartDate !== "") {
      filtered = filtered.filter(
        (a) => new Date(a.publishedAt) >= new Date(filterStartDate)
      );
    }
    if (filterEndDate !== "") {
      filtered = filtered.filter(
        (a) => new Date(a.publishedAt) <= new Date(filterEndDate)
      );
    }
    setFilteredNews(filtered);
  }, [search, filterAuthor, filterType, filterStartDate, filterEndDate, news]);

  const authorCounts = {};
  filteredNews.forEach((a) => {
    const author = a.author || "Unknown";
    authorCounts[author] = (authorCounts[author] || 0) + 1;
  });

  const authorPayouts = Object.entries(authorCounts).map(([author, count]) => {
    const rate = payoutRates[author] || 0;
    return { author, count, rate, payout: count * rate };
  });

  const totalPayout = authorPayouts.reduce((sum, a) => sum + a.payout, 0);

  // Export functions
  const exportCSV = () => {
    const data = authorPayouts.map(({ author, count, rate, payout }) => ({
      Author: author,
      Articles: count,
      Rate: rate,
      Payout: payout,
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "payout_report.csv";
    a.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Payout Report", 14, 20);
    doc.setFontSize(12);
    let y = 30;
    doc.text("Author | Articles | Rate | Payout", 14, y);
    y += 10;
    authorPayouts.forEach(({ author, count, rate, payout }) => {
      doc.text(`${author} | ${count} | $${rate} | $${payout}`, 14, y);
      y += 10;
    });
    doc.text(`Total Payout: $${totalPayout.toFixed(2)}`, 14, y + 10);
    doc.save("payout_report.pdf");
  };

  const exportGoogleSheet = () => {
    const sheetRows = authorPayouts.map(({ author, count, rate, payout }) => [
      author,
      count,
      rate,
      payout,
    ]);
    const csv = Papa.unparse(sheetRows);
    alert("Google Sheets export requires manual upload\n\n" + csv);
  };

  const sortedAuthors = Object.entries(authorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const chartData = {
    labels: sortedAuthors.map((a) => a[0]),
    datasets: [
      {
        label: "Number of Articles",
        data: sortedAuthors.map((a) => a[1]),
        backgroundColor: "rgba(13, 110, 253, 0.7)",
        borderColor: "rgba(13,110,253,1)",
        borderWidth: 1,
      },
    ],
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loadingUser) {
    return (
      <div className={`container py-5 ${darkMode ? "bg-dark text-light" : ""}`}>
        <h3>Loading user...</h3>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Responsive Dashboard with News and Payout</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div
        className={
          darkMode ? "bg-dark text-light min-vh-100" : "bg-light text-dark min-vh-100"
        }
      >
        <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
          <div className="container">
            <a className="navbar-brand" href="/">
              News/Payout Dashboard
            </a>
            <button
              className="btn btn-outline-light mx-2"
              onClick={() => setDarkMode(!darkMode)}
              aria-label="Toggle Dark Mode"
            >
              {darkMode ? "Light Mode" : "Dark Mode"}
            </button>
            {user ? (
              <div className="d-flex align-items-center">
                <span className="me-3">{user.email}</span>
                <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            ) : (
              <></>
            )}
          </div>
        </nav>

        <div className="container py-4">
          {!user ? (
            <UnifiedAuthForm onLoginSuccess={() => {}} />
          ) : (
            <>
              <h1 className="mb-4">Dashboard</h1>

              {/* Filters */}
              <div
                className="row mb-4 g-3"
                role="search"
                aria-label="News Filters"
              >
                <div className="col-sm-12 col-md-4">
                  <input
                    type="search"
                    className="form-control"
                    placeholder="Global Search Keyword"
                    aria-label="Global Search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="col-sm-6 col-md-2">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Filter by Author"
                    aria-label="Filter by Author"
                    value={filterAuthor}
                    onChange={(e) => setFilterAuthor(e.target.value)}
                  />
                </div>
                <div className="col-sm-6 col-md-2">
                  <select
                    className="form-select"
                    aria-label="Filter by Type"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="">All Types</option>
                    <option value="news">News</option>
                    <option value="blog">Blogs</option>
                  </select>
                </div>
                <div className="col-sm-6 col-md-2">
                  <input
                    type="date"
                    className="form-control"
                    aria-label="Filter Start Date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                  />
                </div>
                <div className="col-sm-6 col-md-2">
                  <input
                    type="date"
                    className="form-control"
                    aria-label="Filter End Date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Loading / Error */}
              {loadingNews && <p>Loading news...</p>}
              {errorNews && (
                <div className="alert alert-danger" role="alert">
                  {errorNews}
                </div>
              )}

              {/* Summary */}
              <div className="mb-4">
                <h5>Total articles: {filteredNews.length}</h5>
              </div>

              {/* Charts */}
              <div className="row mb-5" aria-label="News Analytics">
                <div className="col-md-6 mb-3">
                  <div className={`card shadow-sm h-100 ${darkMode ? "bg-secondary text-light" : ""}`}>
                    <div className="card-header">
                      Top 5 Authors by Article Count
                    </div>
                    <div className="card-body">
                      <Bar data={chartData} />
                    </div>
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <div className={`card shadow-sm h-100 ${darkMode ? "bg-secondary text-light" : ""}`}>
                    <div className="card-header">Articles by Type</div>
                    <div className="card-body">
                      <Pie
                        data={{
                          labels: ["News", "Blogs"],
                          datasets: [
                            {
                              data: [
                                filteredNews.filter((a) => a.type === "news").length,
                                filteredNews.filter((a) => a.type === "blog").length,
                              ],
                              backgroundColor: [
                                "rgba(13,110,253,0.6)",
                                "rgba(220,53,69,0.6)",
                              ],
                              borderColor: [
                                "rgba(13,110,253,1)",
                                "rgba(220,53,69,1)",
                              ],
                            },
                          ],
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payout Details */}
              <section aria-label="Payout Details">
                <h3>Payout Details</h3>
                {isAdmin && (
                  <p>
                    You are an admin. You can set payout rates per author below.
                    Changes are saved automatically.
                  </p>
                )}
                <div className="table-responsive">
                  <table
                    className={`table ${
                      darkMode ? "table-dark" : "table-striped"
                    }`}
                  >
                    <thead>
                      <tr>
                        <th>Author</th>
                        <th>Articles</th>
                        <th>Payout Rate ($)</th>
                        <th>Payout ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {authorPayouts.length === 0 && (
                        <tr>
                          <td colSpan="4" className="text-center">
                            No articles match filters.
                          </td>
                        </tr>
                      )}
                      {authorPayouts.map(({ author, count, rate, payout }) => (
                        <tr key={author}>
                          <td>{author}</td>
                          <td>{count}</td>
                          <td>
                            {isAdmin ? (
                              <input
                                type="number"
                                min="0"
                                className="form-control form-control-sm"
                                value={rate}
                                aria-label={`Set payout rate for ${author}`}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val)) {
                                    setPayoutRates((prev) => ({
                                      ...prev,
                                      [author]: val,
                                    }));
                                  }
                                }}
                              />
                            ) : (
                              rate.toFixed(2)
                            )}
                          </td>
                          <td>{payout.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="3" className="text-end fw-bold">
                          Total Payout:
                        </td>
                        <td className="fw-bold">${totalPayout.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Export Buttons */}
                <div className="mb-5">
                  <h4>Export Payout Reports</h4>
                  <button className="btn btn-success me-2" onClick={exportCSV}>
                    Export CSV
                  </button>
                  <button className="btn btn-danger me-2" onClick={exportPDF}>
                    Export PDF
                  </button>
                  <button className="btn btn-primary" onClick={exportGoogleSheet}>
                    Google Sheets Export (Manual)
                  </button>
                </div>
              </section>

              {/* News Article List */}
              <section aria-label="News Articles">
                <h3>News Articles</h3>
                <div className="row g-3">
                  {filteredNews.length === 0 && <p>No articles match your criteria.</p>}
                  {filteredNews.map((article) => (
                    <article
                      className="col-12 col-md-6 col-lg-4"
                      key={article.id}
                    >
                      <div
                        className={`card h-100 ${
                          darkMode ? "bg-secondary text-light" : ""
                        }`}
                      >
                        {article.urlToImage && (
                          <img
                            src={article.urlToImage}
                            className="card-img-top"
                            alt={article.title}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src =
                                "https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/000948cf-84ef-4573-bfc1-d65e732f374b.png";
                            }}
                          />
                        )}
                        <div className="card-body d-flex flex-column">
                          <h5 className="card-title">{article.title}</h5>
                          <p className="card-text flex-grow-1">
                            {article.description}
                          </p>
                          <p className="mb-1">
                            <strong>Author:</strong>{" "}
                            {article.author || "Unknown"}
                          </p>
                          <p className="mb-1">
                            <strong>Published:</strong>{" "}
                            {new Date(article.publishedAt).toLocaleDateString()}
                          </p>
                          <p className="mb-3">
                            <strong>Type:</strong> {article.type}
                          </p>
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline-primary mt-auto"
                          >
                            Read More
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>

        <footer
          className={`text-center py-4 ${
            darkMode ? "bg-primary text-light" : "bg-light text-dark"
          }`}
        >
          &copy; {new Date().getFullYear()} Responsive News & Payout Dashboard
        </footer>
      </div>
    </>
  );
}


