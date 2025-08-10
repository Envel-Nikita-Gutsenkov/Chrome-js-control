# JS Control 🚦

A minimalist Chrome extension built with Manifest V3 that allows you to control JavaScript execution on websites with a single click.

---

## ✨ Features

* **Temporary Disable:** Turn off JavaScript for the current site for the duration of your Browse session.
* **Permanent Disable:** Add a site to a permanent blacklist to block JavaScript every time you visit.
* **Re-enable JS:** Easily turn JavaScript back on for sites where it was previously disabled.
* **Options Page:** Manage and remove sites from your permanent disable list.
* **Manifest V3:** Built using the latest Chrome extension platform for improved security and performance.

---

## 🚀 Installation

1.  **Download/Clone:** Download or clone this repository to your local machine.

2.  **Open Chrome Extensions:**
    * Open your Chrome browser.
    * Navigate to `chrome://extensions`.

3.  **Enable Developer Mode:**
    * In the top right corner, toggle on **"Developer mode"**.

4.  **Load Unpacked Extension:**
    * Click the **"Load unpacked"** button that appears.
    * Select the directory where you downloaded/cloned the extension (`js-control`).

5.  **Pin (Optional):**
    * Click the puzzle piece icon next to your profile avatar in Chrome's toolbar.
    * Find "JS Control" and click the pin icon next to it to make the extension easily accessible.

---

## 👨‍💻 Usage

1.  **Open the Popup:** Click the "JS Control" extension icon in your Chrome toolbar.
2.  **Control JavaScript:**
    * **Disable for this session:** Click this button to temporarily block JS on the current site.
    * **Disable permanently:** Click this to add the site to your permanent blacklist.
    * **Enable JS:** Click this to re-enable JavaScript if it was disabled.
3.  **Manage Sites:**
    * Click the "Options" button in the popup to open the management page, where you can view and remove sites from your permanent blacklist.

---

## 📁 Project Structure

````
js-control/
├── manifest.json       # Extension manifest (defines permissions, background script, etc.)
├── background.js       # Service Worker: Handles declarativeNetRequest rules for blocking/unblocking JS
├── popup.html          # HTML for the extension's popup interface
├── popup.js            # JavaScript for handling user interaction in the popup
├── options.html        # HTML for the options page to manage permanently disabled sites
├── options.js          # JavaScript for handling the options page logic
└── icons/              # Directory for extension icons
├── icon16.png
├── icon48.png
└── icon128.png
````

---

## 🤝 Contributing

Contributions are welcome! If you have ideas for improvements, bug fixes, or new features, feel free to:

1.  Fork the repository.
2.  Create a new branch.
3.  Make your changes.
4.  Commit your changes.
5.  Push the branch to your forked repository.
6.  Open a Pull Request with a clear description of your changes.

---

## 📜 License

This project is licensed under the MIT License. See the `LICENSE` file for details.