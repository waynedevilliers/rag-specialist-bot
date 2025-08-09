**Description:**

In this project, you will build a specialized chatbot using Streamlit and LangChain that implements advanced RAG (Retrieval Augmented Generation) and function calling capabilities. The chatbot will be focused on a specific domain or use case, making it more practical and valuable.

**Topics:**

* Advanced RAG Implementation  
* Function Calling
* ChatGPT
* Prompt Engineering
* Streamlit / Next.js
* LangChain
* Vector Databases

**Prerequisites:**

* Python / TypeScript knowledge
* Knowledge of ChatGPT and OpenAI API
* Basic knowledge of Streamlit / Next.js
* Understanding of RAG concepts from Part 3
* Familiarity with function calling

**Estimated time to complete:** 20-25 hours

## Task Description

This project represents a significant step up from basic chatbot implementation. You will create a specialized chatbot that leverages advanced RAG techniques and function calling to provide domain-specific assistance. The goal is to build something that could be valuable in a real-world context.

**We will be using LangChain, your framework (Streamlit or Next.js) of choice, and implementing advanced RAG techniques.**

**The intended code editor for this project is [VS Code](https://code.visualstudio.com/).**

Your chatbot will:
1. Implement advanced RAG with query translation and structured retrieval
2. Include function calling capabilities for practical tasks
3. Focus on a specific domain or use case
4. Provide detailed, context-aware responses

Example use cases (but feel free to create your own):
- Career Consultant Bot: Uses World Economic Forum reports and job market data to provide career advice
- Technical Documentation Assistant: Helps developers understand and work with specific frameworks or libraries
- Financial Advisor Bot: Analyzes market trends and provides investment insights
- Healthcare Information Assistant: Provides accurate medical information from verified sources
- Legal Research Assistant: Helps with legal queries using case law and legal documents

## Task Requirements

**Core Requirements:**

1. **RAG Implementation:**

   - Create a knowledge base relevant to your domain
   - Implement standard document retrieval with embeddings
   - Use chunking strategies and similarity search

2. **Function Calling:**
   - Implement at least 3 different function calls
   - Functions should be relevant to your domain
   - Examples: data analysis, calculations, API integrations

3. **Domain Specialization:**
   - Choose a specific domain or use case
   - Create a focused knowledge base
   - Implement domain-specific prompts and responses
   - Add relevant security measures for your domain

4. **Technical Implementation:**
   - Use LangChain for OpenAI API integration
   - Implement proper error handling
   - Add logging and monitoring
   - Include user input validation
   - Implement rate limiting and API key management

5. **User Interface:**
   - Create an intuitive interface using Streamlit or Next.js
   - Show relevant context and sources
   - Display function call results
   - Include progress indicators for long operations

## Optional Tasks

After the main functionality is implemented and your code works correctly, and you feel that you want to upgrade your project, choose one or more improvements from this list.
The list is sorted by difficulty levels.

**Caution: Some of the tasks in medium or hard categories may contain tasks with concepts or libraries that may be introduced in later sections or even require outside knowledge/time to research outside of the course.**

**Easy:**
1. Add conversation history and export functionality
2. Add visualization of RAG process
3. Include source citations in responses
4. Add an interactive help feature or chatbot guide

**Medium:**
1. Implement multi-model support (OpenAI, Anthropic, etc.)
2. Add real-time data updates to knowledge base
3. Implement advanced caching strategies
4. Add user authentication and personalization
5. Calculate and display token usage and costs
6. Add visualization of function call results
7. Implement conversation export in various formats (PDF, CSV, JSON)
8. Connect to tools from a publicly available remote MCP server

**Hard:**
1. Deploy to cloud with proper scaling 
2. Implement advanced indexing (e.g., RAPTOR, ColBERT)
3. Implement A/B testing for different RAG strategies
4. Add automated knowledge base updates
5. Fine-tune the model for your specific domain
6. Add multi-language support
7. Implement advanced analytics dashboard
8. Implement your tools (functions) as MCP servers.

## Evaluation Criteria

* **Understanding Core Concepts:**
  * The learner understands the basic principles of how RAG works
  * The learner can explain function calling implementation clearly
  * The learner demonstrates good code organization practices
  * The learner can identify potential error scenarios and edge cases

* **Technical Implementation:**
  * The learner knows how to use a front-end library using their knowledge and/or external resources
  * The learner's project works as intended; you can chat with a chatbot and get answers
  * The learner has created a relevant knowledge base for their domain
  * The learner has implemented appropriate security considerations

* **Reflection and Improvement:**
  * The learner understands the potential problems with the application
  * The learner can offer suggestions on improving the code and the project

* **Bonus Points:**
  * For maximum points, the learner should implement at least 2 medium and 1 hard optional task.

## How to get started with Streamlit (for Python developers)

It is very likely that you are seeing and hearing about Streamlit for the first time. No worries!

It's a fantastic framework for creating interactive web apps using Python, particularly for **data visualization**, **machine learning demos**, and **quick prototyping**.

You don't need to know much about front-end things, like HTML, CSS, JS, React, or others, to build apps! Streamlit will do the basics of front-end for you by just writing Python code.

**Learning Streamlit:**

* You can get started by watching this [video](https://www.youtube.com/watch?v=D0D4Pa22iG0&ab_channel=pixegami).
* After that, check out their [page](https://streamlit.io/).
* Check their documentation on [page elements](https://docs.streamlit.io/develop/api-reference).
* A good starting point could be their ["Get Started" section](https://docs.streamlit.io/get-started).
* Lastly, GeeksForGeeks also offers a good tutorial on [Streamlit](https://www.geeksforgeeks.org/a-beginners-guide-to-streamlit/).
* [YouTube short.](https://youtube.com/shorts/iPj6QKMd8qA?si=d0i19vdfr3x4jAn0)
* Tutorial on using Streamlit in [VS Code](https://www.youtube.com/watch?v=2siBrMsqF44&ab_channel=TechWithTim).

## How to use Next.js for RAG (for JS developers)

You can either choose one of the following:

- Next.js from scratch, either `create-next-app` or the project template from the previous project
- [LangChain's Next.js template](https://github.com/langchain-ai/langchain-nextjs-template) with some RAG functionality
- some other JS full-stack framework or a Python backend + JS frontend project

We recommend using the LangChain's Next.js template for most learners, as it is the most straightforward way to get started. However, since it already has some of the requirements implemented, we expect you to implement at least one optional task (apart from a solution critique) to get the maximum mark. Also, do not forget to delete the unused code from the template, since it provides multiple flows that you might not need.

Since this is not your first project and we expect you to have some TypeScript experience, we believe you do not need much hand-holding to get started. However, if you need help, you can always ask your peers or JTLs for help.

## Approach to solving the task

* 1-5 hours of attempting to solve the task using your own knowledge + ChatGPT. It is encouraged to use ChatGPT both for:
    * Understanding this task better
    * Writing the code
    * Improving the code
    * Understanding the code
* You can also take a look at the "How to Get Started sections to better understand how to get started with Streamlit or Next.js.
* If you feel that some knowledge is missing, please revisit the parts in Sprint 1 OR check out additional resources.
* If during the first 1-2 hours you see you are making no progress and that the task seems much too hard for you, we recommend 10 more hours working on the problem with help from peers and JTLs.
* Out of these 10 hours, you are expected to spend about half of them working with someone else—whether it is peer study buddies, peers who have completed the exercise and want to help you, or JTLs in open sessions.


## Submission:

Read an [in-depth guide about reviews here](https://turingcollege.atlassian.net/wiki/spaces/LG2/pages/1940258818/Peer+Expert+reviews).

### Submission and Scheduling a Project Review

To submit the project and allow the reviewer to view your work beforehand, you need to use the Github repository that has been created for you.
Please go through these material to learn more about submitting projects, scheduling project reviews and using Github:

- [Completing a Sprint, Submitting a Project and Scheduling Reviews](https://www.notion.so/Completing-a-Sprint-Submitting-a-Project-and-Scheduling-Reviews-4bdc709c2b7142c8aa7dd06d1d289768?pvs=4)
- [Git and GitHub for Beginners](https://www.youtube.com/watch?v=RGOj5yH7evk)


## Additional resources

This corner is for those who think they lack some specific knowledge, be it about OpenAI, requests, or Python libraries.
Here are some helpful resources that you could read to better understand the task:

- [OpenAI Documentation – Learn how to integrate OpenAI's API and leverage its powerful AI models.](https://platform.openai.com/docs/api-reference/introduction)
- [Your Best Friend, ChatGPT – Explore and experiment with ChatGPT for AI-driven conversations.](https://chatgpt.com/)
- [Get Your OpenAI API Key – Set up your API key to start building AI-powered applications.](https://platform.openai.com/api-keys)
- [What is an API? What is OpenAI's API? – A beginner-friendly video explaining APIs and OpenAI's API capabilities.](https://www.youtube.com/watch?v=hcyOajJfSLs&ab_channel=DataCamp)
- [Streamlit YouTube Channel – Learn how to build interactive AI-powered web apps using Streamlit.](https://www.youtube.com/@streamlitofficial)
