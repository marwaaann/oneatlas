import type { RawBenchmark, RawLab, RawProvider } from "../../src/lib/ingest/schema";

export const labs: RawLab[] = [
  { slug: "openai", name: "OpenAI", type: "company", description: "Creator of the GPT and o-series models, ChatGPT and the OpenAI API.", website: "https://openai.com", headquarters: "San Francisco, USA", foundedYear: 2015, accentColor: "#10a37f" },
  { slug: "anthropic", name: "Anthropic", type: "company", description: "AI safety company building the Claude family of models.", website: "https://www.anthropic.com", headquarters: "San Francisco, USA", foundedYear: 2021, accentColor: "#d97757" },
  { slug: "google-deepmind", name: "Google DeepMind", type: "research lab", description: "Google's AI research lab behind Gemini and the open Gemma models.", website: "https://deepmind.google", headquarters: "London, UK", foundedYear: 2010, accentColor: "#4285f4" },
  { slug: "meta", name: "Meta AI", type: "company", description: "Meta's AI group, publisher of the open-weights Llama model family.", website: "https://ai.meta.com", headquarters: "Menlo Park, USA", foundedYear: 2013, accentColor: "#0866ff" },
  { slug: "mistral", name: "Mistral AI", type: "company", description: "European lab shipping efficient open and commercial models.", website: "https://mistral.ai", headquarters: "Paris, France", foundedYear: 2023, accentColor: "#fa520f" },
  { slug: "deepseek", name: "DeepSeek", type: "research lab", description: "Research lab known for highly efficient open-weights MoE and reasoning models.", website: "https://www.deepseek.com", headquarters: "Hangzhou, China", foundedYear: 2023, accentColor: "#4d6bfe" },
  { slug: "alibaba-qwen", name: "Qwen (Alibaba)", type: "company", description: "Alibaba Cloud's Qwen team, releasing a broad family of open models.", website: "https://qwenlm.github.io", headquarters: "Hangzhou, China", foundedYear: 2023, accentColor: "#615ced" },
  { slug: "xai", name: "xAI", type: "company", description: "Builder of the Grok model series.", website: "https://x.ai", headquarters: "Palo Alto, USA", foundedYear: 2023, accentColor: "#9ca3af" },
  { slug: "cohere", name: "Cohere", type: "company", description: "Enterprise-focused models for RAG, search and multilingual workloads.", website: "https://cohere.com", headquarters: "Toronto, Canada", foundedYear: 2019, accentColor: "#39594d" },
  { slug: "moonshot", name: "Moonshot AI", type: "company", description: "Maker of the Kimi models, focused on long context and agentic coding.", website: "https://www.moonshot.ai", headquarters: "Beijing, China", foundedYear: 2023, accentColor: "#1783ff" },
  { slug: "zhipu", name: "Z.ai (Zhipu)", type: "company", description: "Developer of the GLM family of open bilingual models.", website: "https://z.ai", headquarters: "Beijing, China", foundedYear: 2019, accentColor: "#2d5bff" },
  { slug: "nous-research", name: "Nous Research", type: "open source collective", description: "Open-source collective known for Hermes fine-tunes of open base models.", website: "https://nousresearch.com", headquarters: "Distributed", foundedYear: 2023, accentColor: "#e11d48" },
];

export const providers: RawProvider[] = [
  { slug: "openai", name: "OpenAI API", type: "first party", description: "OpenAI's own API platform.", website: "https://platform.openai.com", accentColor: "#10a37f" },
  { slug: "anthropic", name: "Anthropic API", type: "first party", description: "Anthropic's Claude API.", website: "https://docs.anthropic.com", accentColor: "#d97757" },
  { slug: "google-ai-studio", name: "Google AI Studio", type: "first party", description: "Gemini API for developers via AI Studio.", website: "https://aistudio.google.com", accentColor: "#4285f4" },
  { slug: "mistral", name: "Mistral La Plateforme", type: "first party", description: "Mistral's hosted API.", website: "https://console.mistral.ai", accentColor: "#fa520f" },
  { slug: "deepseek", name: "DeepSeek Platform", type: "first party", description: "DeepSeek's hosted API.", website: "https://platform.deepseek.com", accentColor: "#4d6bfe" },
  { slug: "xai", name: "xAI API", type: "first party", description: "API access to Grok models.", website: "https://console.x.ai", accentColor: "#9ca3af" },
  { slug: "cohere", name: "Cohere Platform", type: "first party", description: "Cohere's hosted API.", website: "https://dashboard.cohere.com", accentColor: "#39594d" },
  { slug: "moonshot", name: "Moonshot Platform", type: "first party", description: "Kimi models via Moonshot's API.", website: "https://platform.moonshot.ai", accentColor: "#1783ff" },
  { slug: "alibaba-cloud", name: "Alibaba Cloud Model Studio", type: "first party", description: "Qwen models on Alibaba Cloud.", website: "https://www.alibabacloud.com/product/modelstudio", accentColor: "#ff6a00" },
  { slug: "zhipu", name: "Z.ai API", type: "first party", description: "GLM models via Z.ai's API.", website: "https://z.ai", accentColor: "#2d5bff" },
  { slug: "aws-bedrock", name: "Amazon Bedrock", type: "cloud", description: "AWS managed service for foundation models.", website: "https://aws.amazon.com/bedrock", accentColor: "#ff9900" },
  { slug: "google-vertex", name: "Google Vertex AI", type: "cloud", description: "Google Cloud's enterprise ML platform and Model Garden.", website: "https://cloud.google.com/vertex-ai", accentColor: "#34a853" },
  { slug: "azure-ai-foundry", name: "Azure AI Foundry", type: "cloud", description: "Microsoft Azure's model catalog, including Azure OpenAI.", website: "https://ai.azure.com", accentColor: "#0078d4" },
  { slug: "together", name: "Together AI", type: "inference", description: "Serverless inference for open-weights models.", website: "https://www.together.ai", accentColor: "#0f6fff" },
  { slug: "groq", name: "Groq", type: "inference", description: "LPU-based inference optimised for very high token throughput.", website: "https://groq.com", accentColor: "#f55036" },
  { slug: "fireworks", name: "Fireworks AI", type: "inference", description: "Fast inference and fine-tuning platform for open models.", website: "https://fireworks.ai", accentColor: "#6720ff" },
  { slug: "deepinfra", name: "DeepInfra", type: "inference", description: "Low-cost serverless inference for open models.", website: "https://deepinfra.com", accentColor: "#22c55e" },
  { slug: "cerebras", name: "Cerebras", type: "inference", description: "Wafer-scale hardware delivering extreme output speeds.", website: "https://www.cerebras.ai", accentColor: "#f97316" },
];

export const benchmarks: RawBenchmark[] = [
  { slug: "mmlu-pro", name: "MMLU-Pro", category: "knowledge", description: "Harder, 10-choice successor to MMLU across 14 academic domains.", url: "https://github.com/TIGER-AI-Lab/MMLU-Pro" },
  { slug: "gpqa-diamond", name: "GPQA Diamond", category: "reasoning", description: "Graduate-level, 'Google-proof' science questions written by domain experts.", url: "https://github.com/idavidrein/gpqa" },
  { slug: "humaneval", name: "HumanEval", category: "coding", description: "Python function synthesis from docstrings, pass@1.", url: "https://github.com/openai/human-eval" },
  { slug: "livecodebench", name: "LiveCodeBench", category: "coding", description: "Contamination-resistant competitive programming problems collected over time.", url: "https://livecodebench.github.io" },
  { slug: "swe-bench-verified", name: "SWE-bench Verified", category: "agentic", description: "Resolving real GitHub issues in Python repos; human-validated subset.", url: "https://www.swebench.com" },
  { slug: "math-500", name: "MATH-500", category: "math", description: "500 competition mathematics problems from the MATH dataset.", url: "https://github.com/hendrycks/math" },
  { slug: "aime-2025", name: "AIME 2025", category: "math", description: "American Invitational Mathematics Examination 2025 problems.", url: "https://artofproblemsolving.com/wiki/index.php/AIME_Problems_and_Solutions" },
  { slug: "mmmu", name: "MMMU", category: "multimodal", description: "College-level multimodal understanding across charts, diagrams and images.", url: "https://mmmu-benchmark.github.io" },
];
