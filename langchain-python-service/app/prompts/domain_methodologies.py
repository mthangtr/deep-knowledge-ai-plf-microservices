from app.config.model_router_config import Domain

PROGRAMMING_METHODOLOGY = """
**METHODOLOGY FOR PROGRAMMING:**
Structure the course following this modern pedagogical approach:
1.  **Core Concepts & Mental Model:** Start with the "Why". Explain the fundamental problem the technology solves.
2.  **Syntax & Basic Usage:** Introduce the core syntax and commands with simple, runnable examples.
3.  **Guided Small Projects:** Build 1-2 small, practical projects that apply the concepts learned.
4.  **Advanced Topics:** Cover more complex topics like performance optimization, security, and testing.
5.  **Ecosystem & Real World:** Discuss the surrounding ecosystem, common libraries, and how it's used in real-world production environments.
"""

LANGUAGE_METHODOLOGY = """
**METHODOLOGY FOR LANGUAGE LEARNING:**
Structure the course using a holistic and integrated approach. The outline must weave these components together, not just list them separately:
1.  **Foundation:** Start with basic grammar rules and essential vocabulary for immediate use.
2.  **Thematic Units:** Group subsequent lessons into practical themes (e.g., Travel, Work, Food).
3.  **Integrated Skills:** Within each unit, blend Vocabulary, Grammar, Reading, and Listening exercises.
4.  **Active Practice:** Ensure each unit includes prompts for Speaking and Writing practice to reinforce learning.
5.  **Cultural Context:** Include notes on cultural nuances related to the language.
"""

SCIENCE_METHODOLOGY = """
**METHODOLOGY FOR SCIENCE:**
Structure the course based on the scientific method and hierarchical understanding:
1.  **Foundational Principles:** Begin with the core laws, theories, and established principles.
2.  **Key Models & Formulas:** Introduce the essential mathematical models and formulas, explaining each variable.
3.  **Experimental Evidence:** Discuss the key experiments or observations that support the theories.
4.  **Problem-Solving Application:** Provide sections with practice problems of increasing difficulty.
5.  **Modern Applications & Frontiers:** Conclude with how these principles are applied in modern technology and current research areas.
"""

FINANCE_METHODOLOGY = """
**METHODOLOGY FOR FINANCE:**
Structure the course to build a strong foundation and progress to practical wealth management.
1.  **Foundational Concepts:** Start with the absolute basics: Why financial management is important, assets vs. liabilities, cash flow, and setting financial goals.
2.  **Budgeting and Saving:** Cover practical techniques for creating and sticking to a budget, and effective saving strategies.
3.  **Debt and Credit Management:** Explain different types of debt, how to manage them responsibly, and the importance of credit scores.
4.  **Core Investing Principles:** Introduce fundamental investment concepts, including risk vs. return, diversification, and different investment vehicles (stocks, bonds, funds).
5.  **Retirement and Long-Term Planning:** Discuss long-term planning, including retirement accounts and estate planning basics.
6.  **Advanced Topics & Behavioral Finance:** Touch upon more advanced investment strategies and the psychological aspects of financial decision-making.
"""

DEFAULT_METHODOLOGY = "Follow a standard, logical progression from foundational concepts to more advanced topics. Ensure a balance between theory and practical examples."

DOMAIN_METHODOLOGY_MAP = {
    Domain.PROGRAMMING: PROGRAMMING_METHODOLOGY,
    Domain.SCIENCE: SCIENCE_METHODOLOGY,
    Domain.LANGUAGE: LANGUAGE_METHODOLOGY,
    Domain.FINANCE: FINANCE_METHODOLOGY,
    Domain.DEFAULT: DEFAULT_METHODOLOGY,
    # This can be expanded with other domains.
    # For now, let's map LANGUAGE here as an example, assuming the router can detect it.
    "LANGUAGE": LANGUAGE_METHODOLOGY 
} 