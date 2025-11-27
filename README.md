# **Adaptive Quiz Generator App**  
*Individual Assignment for SENG 513 - University of Calgary*

## **Project Description**
The **Adaptive Quiz Generator App** is a full-stack web application that dynamically generates quizzes based on topics selected by the user. The app adjusts question difficulty based on the user's performance, ensuring that each quiz is appropriately challenging. It also tracks user scores, maintains a history of quizzes taken, and allows users to export their scores as a **JSON** file.

### **Key Features**:
- **Dynamic Quiz Generation**: Users can select topics, and the app generates questions from an API.
- **Adaptive Difficulty**: As users progress, the app adjusts the difficulty of questions based on previous answers.
- **Score Tracking**: Displays score history and tracks streaks of correct answers.
- **JSON Export**: Allows users to export their quiz results in **JSON** format for later use.
- **Responsive Design**: Optimized for both desktop and mobile views.

---

## **Technologies Used**:
- **HTML5**: Structure and content of the web application.
- **CSS3**: Custom styling with responsive design using **Tailwind CSS**.
- **JavaScript**: Application logic for quiz generation, scoring, and adaptive difficulty.
- **API Integration**: Integration with a third-party quiz API to dynamically fetch questions.
- **JSON**: Used for score export functionality.

---

## **Getting Started**:

### **Prerequisites**:
Make sure you have the following installed:
- **Web Browser**: Any modern web browser like Chrome, Firefox, Safari.
- **Code Editor** (optional): VSCode, Sublime Text, or any editor you prefer for further development.

### **Installation**:
1. Clone the repository to your local machine:
   ```bash
   git clone https://github.com/yourusername/adaptive-quiz-generator.git
    ```

2. Navigate to the project directory:

   ```bash
   cd adaptive-quiz-generator
   ```
3. Open the `index.html` file in your web browser to view the app.

---

## **Usage**:

1. Open the app in your browser.
2. Select a topic from the dropdown menu to start the quiz.
3. Answer the questions, and the app will dynamically adjust the difficulty of the next questions based on your performance.
4. After finishing the quiz, your score will be displayed, and you can export it as a **JSON** file for later reference.
5. Review your quiz history and performance across different sessions.
