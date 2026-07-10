// ai_evaluator.js
// Sophisticated scoring and cognitive analytics engine simulating an AI evaluator.

const AIEvaluator = {
  evaluate(questions, studentAnswers, timeTakenSeconds) {
    let score = 0;
    const total = questions.length;
    const categoryStats = {};

    // 1. Calculate score & category breakdown
    questions.forEach((q, index) => {
      const studentAns = studentAnswers[index];
      const isCorrect = studentAns !== undefined && studentAns === q.correct;
      
      if (isCorrect) {
        score++;
      }

      if (!categoryStats[q.category]) {
        categoryStats[q.category] = { correct: 0, total: 0 };
      }
      categoryStats[q.category].total++;
      if (isCorrect) {
        categoryStats[q.category].correct++;
      }
    });

    const accuracy = total > 0 ? (score / total) * 100 : 0;
    const avgTimePerQuestion = total > 0 ? timeTakenSeconds / total : 0;

    // 2. Determine Archetype / Cognitive Profile
    let cognitiveProfile = "Balanced Thinker";
    let highestCategory = "";
    let highestScoreRatio = -1;

    Object.keys(categoryStats).forEach(cat => {
      const stats = categoryStats[cat];
      const ratio = stats.correct / stats.total;
      if (ratio > highestScoreRatio) {
        highestScoreRatio = ratio;
        highestCategory = cat;
      }
    });

    if (accuracy >= 90) {
      cognitiveProfile = "Synthesized Systems Architect";
    } else if (highestCategory === "Quantitative" && highestScoreRatio >= 0.7) {
      cognitiveProfile = "Algorithmic Precision Strategist";
    } else if (highestCategory === "Logical" && highestScoreRatio >= 0.7) {
      cognitiveProfile = "Heuristic Deductive Logician";
    } else if (highestCategory === "Verbal" && highestScoreRatio >= 0.7) {
      cognitiveProfile = "Semantic Network Analyst";
    } else if (highestCategory === "AI & Tech" && highestScoreRatio >= 0.7) {
      cognitiveProfile = "Emergent Systems Architect";
    } else if (avgTimePerQuestion < 8 && accuracy >= 60) {
      cognitiveProfile = "High-Velocity Pattern Matcher";
    } else if (accuracy < 50) {
      cognitiveProfile = "Developing Systems Analyst";
    }

    // 3. Generate Strengths, Weaknesses, and Roadmap
    const strengths = [];
    const weaknesses = [];
    const roadmap = [];

    // Category evaluation
    Object.keys(categoryStats).forEach(cat => {
      const stats = categoryStats[cat];
      const ratio = stats.correct / stats.total;
      if (ratio >= 0.8) {
        if (cat === "Quantitative") strengths.push("Excellent mathematical and quantitative reasoning; displays solid grasp of computational efficiency overheads.");
        if (cat === "Logical") strengths.push("Exceptional deductive logic; excels at structural sequences, parallel hierarchies, and deductive puzzles.");
        if (cat === "Verbal") strengths.push("High semantic alignment; parses contextual analogies and linguistic structural relationships accurately.");
        if (cat === "AI & Tech") strengths.push("Robust domain familiarity; displays deep understanding of neural networks, attention mechanisms, and optimization theory.");
      } else if (ratio <= 0.4) {
        if (cat === "Quantitative") {
          weaknesses.push("Vulnerability in quantitative optimization and numerical scale estimation.");
          roadmap.push("Practice algorithmic complexity problems and parallel scheduling math.");
        }
        if (cat === "Logical") {
          weaknesses.push("Tendency to misinterpret structured constraint-satisfaction conditions and sequence dependencies.");
          roadmap.push("Work through abstract tree traversal patterns and symbolic logic puzzles.");
        }
        if (cat === "Verbal") {
          weaknesses.push("Sub-optimal semantic mapping; struggles with multi-layer relational analogies.");
          roadmap.push("Improve comprehension of abstract syntax, language models, and formal nomenclature.");
        }
        if (cat === "AI & Tech") {
          weaknesses.push("Gaps in foundational AI paradigms, including optimization step adjustments and architectural models.");
          roadmap.push("Study deep learning foundations, focusing on transformer attention weights, overfitting cures, and F1 calculations.");
        }
      }
    });

    // Pacing evaluation
    if (avgTimePerQuestion < 8) {
      strengths.push("High-velocity processing speed; resolves decision nodes exceptionally fast.");
      if (accuracy < 70) {
        weaknesses.push("Vulnerable to cognitive impulsivity; speed was prioritized at the expense of computational verification.");
        roadmap.push("Slow down by 5-10 seconds on complex logic prompts to execute mental validation steps before committing.");
      }
    } else if (avgTimePerQuestion > 25) {
      weaknesses.push("Pacing bottleneck; excessively long dwell times on difficult evaluation nodes.");
      roadmap.push("Implement a time-boxing strategy (max 20 seconds per item) to maximize score yield.");
    } else {
      strengths.push("Excellent pacing control; maintains a sustainable, deliberate cognitive cadence (avg. " + Math.round(avgTimePerQuestion) + "s / question).");
    }

    // Default fallbacks if lists are empty
    if (strengths.length === 0) strengths.push("Demonstrated steady execution across multiple reasoning sectors.");
    if (weaknesses.length === 0) strengths.push("Exceptional comprehensive execution with no glaring cognitive gaps observed.");
    if (roadmap.length === 0) roadmap.push("Continue testing with custom uploaded question sets to locate hidden edge-case bottlenecks.");

    // 4. Generate Narrative Report
    const narrativeReport = this.compileNarrative(cognitiveProfile, accuracy, score, total, timeTakenSeconds, strengths, weaknesses, roadmap);

    return {
      score,
      total,
      accuracy,
      timeTakenSeconds,
      avgTimePerQuestion,
      categoryStats,
      cognitiveProfile,
      insights: {
        strengths,
        weaknesses,
        roadmap
      },
      narrativeReport
    };
  },

  compileNarrative(profile, accuracy, score, total, seconds, strengths, weaknesses, roadmap) {
    const accuracyTier = accuracy >= 85 ? "Excellent" : accuracy >= 70 ? "Proficient" : accuracy >= 50 ? "Competent" : "Needs Development";
    
    let html = `
      <div class="ai-report-narrative">
        <h4 class="report-section-title">Cognitive Assessment Executive Summary</h4>
        <p>
          Subject evaluated as an <strong>${profile}</strong> with an accuracy rating of 
          <strong>${accuracy.toFixed(1)}%</strong> (${score}/${total} resolved correctly) over a duration of 
          <strong>${seconds} seconds</strong>. The performance places the user in the 
          <strong>${accuracyTier}</strong> bracket for AI systems-level aptitude.
        </p>
        
        <h4 class="report-section-title">Diagnostic Analysis</h4>
        <p>
          Our evaluation indicates that the subject's primary cognitive style is characterized by 
          ${profile === "Synthesized Systems Architect" ? "highly integrated, cross-disciplinary comprehension, resolving complex logic and systems metrics seamlessly." : ""}
          ${profile === "Algorithmic Precision Strategist" ? "strong numerical execution and mathematical model formulation. They excel when parsing quantitative workloads." : ""}
          ${profile === "Heuristic Deductive Logician" ? "sharp deductive reasoning, excelling at constraint systems, patterns, and structure parsing." : ""}
          ${profile === "Semantic Network Analyst" ? "refined semantic parsing, mapping analogies, and linguistic relationships with high accuracy." : ""}
          ${profile === "Emergent Systems Architect" ? "excellent grasp of machine learning, training dynamics, parameter constraints, and deep learning topologies." : ""}
          ${profile === "High-Velocity Pattern Matcher" ? "extraordinary execution speed. They rely on direct pattern matching, though details can occasionally be bypassed." : ""}
          ${profile === "Balanced Thinker" ? "a steady, multi-disciplinary approach with balanced attention across all aptitude sectors." : ""}
          ${profile === "Developing Systems Analyst" ? "a growing familiarity with analytical concepts, requiring more practice in core deductive modules to optimize accuracy." : ""}
        </p>

        <h4 class="report-section-title">Key Core Strengths</h4>
        <ul>
          ${strengths.map(s => `<li>${s}</li>`).join("")}
        </ul>

        ${weaknesses.length > 0 ? `
          <h4 class="report-section-title">Identified Vulnerabilities</h4>
          <ul>
            ${weaknesses.map(w => `<li>${w}</li>`).join("")}
          </ul>
        ` : ""}

        <h4 class="report-section-title">Personalized Skill Roadmap</h4>
        <ol>
          ${roadmap.map(r => `<li>${r}</li>`).join("")}
        </ol>
      </div>
    `;

    return html;
  }
};

window.AIEvaluator = AIEvaluator;
