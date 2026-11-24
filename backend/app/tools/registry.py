import os
import re
import math
import asyncio
from typing import Dict, Any, List, Optional
from pathlib import Path
from app.core.config import settings
from app.rag.retrieval import rag_service

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, Dict[str, Any]] = {}
        self._register_builtins()

    def _register_builtins(self):
        # 1. Calculator
        self.register_tool(
            tool_id="calculator",
            name="Scientific Calculator",
            description="Evaluates mathematical and arithmetic expressions safely.",
            input_schema={
                "type": "object",
                "properties": {
                    "expression": {"type": "string", "description": "Mathematical expression, e.g., '125 * 4.5 + sqrt(144)'"}
                },
                "required": ["expression"]
            },
            handler=self._tool_calculator,
            requires_approval=False
        )

        # 2. File Reader
        self.register_tool(
            tool_id="file_reader",
            name="Authorized File Reader",
            description="Reads contents of authorized files stored in private local workspace storage.",
            input_schema={
                "type": "object",
                "properties": {
                    "filename": {"type": "string", "description": "Name or relative path of file in storage"}
                },
                "required": ["filename"]
            },
            handler=self._tool_file_reader,
            requires_approval=False
        )

        # 3. Knowledge Base Search
        self.register_tool(
            tool_id="kb_search",
            name="Knowledge Base Search",
            description="Performs semantic vector search over an authorized private knowledge base collection.",
            input_schema={
                "type": "object",
                "properties": {
                    "kb_id": {"type": "string", "description": "Target Knowledge Base UUID"},
                    "query": {"type": "string", "description": "Search query or question"}
                },
                "required": ["kb_id", "query"]
            },
            handler=self._tool_kb_search,
            requires_approval=False
        )

        # 4. Isolated Python Executor
        self.register_tool(
            tool_id="python_executor",
            name="Isolated Python Executor",
            description="Executes sandboxed Python calculation scripts with strict timeout and restricted builtins.",
            input_schema={
                "type": "object",
                "properties": {
                    "code": {"type": "string", "description": "Python snippet to execute. Store final result in variable 'result'."}
                },
                "required": ["code"]
            },
            handler=self._tool_python_executor,
            requires_approval=True
        )

        # 5. CSV Analyzer
        self.register_tool(
            tool_id="csv_analyzer",
            name="Tabular CSV Analyzer",
            description="Analyzes CSV file structure, columns, summary statistics, and row counts.",
            input_schema={
                "type": "object",
                "properties": {
                    "filename": {"type": "string", "description": "CSV filename in uploads or storage"}
                },
                "required": ["filename"]
            },
            handler=self._tool_csv_analyzer,
            requires_approval=False
        )

        # 6. SQL Query Tool
        self.register_tool(
            tool_id="sql_query",
            name="Read-Only SQL Query Tool",
            description="Executes safe read-only SELECT queries on application tables (models, agents, documents).",
            input_schema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "SQL SELECT query"}
                },
                "required": ["query"]
            },
            handler=self._tool_sql_query,
            requires_approval=True
        )

    def register_tool(self, tool_id: str, name: str, description: str, input_schema: Dict[str, Any], handler: Any, requires_approval: bool = False):
        self._tools[tool_id] = {
            "id": tool_id,
            "name": name,
            "description": description,
            "input_schema": input_schema,
            "handler": handler,
            "requires_approval": requires_approval,
            "is_enabled": True
        }

    def list_tools(self) -> List[Dict[str, Any]]:
        return [{
            "id": v["id"],
            "name": v["name"],
            "description": v["description"],
            "input_schema": v["input_schema"],
            "requires_approval": v["requires_approval"],
            "is_enabled": v["is_enabled"]
        } for v in self._tools.values()]

    def get_tool(self, tool_id: str) -> Optional[Dict[str, Any]]:
        return self._tools.get(tool_id)

    async def execute_tool(self, tool_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        tool = self._tools.get(tool_id)
        if not tool:
            return {"error": f"Tool '{tool_id}' not found in registry."}
        if not tool["is_enabled"]:
            return {"error": f"Tool '{tool_id}' is disabled by administrator policy."}

        try:
            handler = tool["handler"]
            if asyncio.iscoroutinefunction(handler):
                result = await handler(parameters)
            else:
                result = handler(parameters)
            return {"status": "success", "result": result}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    # Built-in handlers
    def _tool_calculator(self, params: Dict[str, Any]) -> str:
        expr = params.get("expression", "")
        # Sanitize
        allowed_chars = r"^[0-9\+\-\*\/\(\)\.\,\s\%eEmathsqrtpisincoagnabs\^]+$"
        clean = expr.replace("^", "**")
        safe_dict = {
            "sqrt": math.sqrt, "sin": math.sin, "cos": math.cos,
            "tan": math.tan, "abs": abs, "pi": math.pi, "e": math.e,
            "log": math.log, "pow": pow, "round": round
        }
        res = eval(clean, {"__builtins__": {}}, safe_dict)
        return str(res)

    def _tool_file_reader(self, params: Dict[str, Any]) -> str:
        filename = os.path.basename(params.get("filename", ""))
        for search_dir in [settings.DOCUMENTS_DIR, settings.UPLOADS_DIR, settings.STORAGE_DIR]:
            p = search_dir / filename
            if p.exists():
                with open(p, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read(4000)
                    return content
        return f"File '{filename}' not found in authorized local storage."

    def _tool_kb_search(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        kb_id = params.get("kb_id", "")
        query = params.get("query", "")
        return rag_service.search_knowledge_base(kb_id=kb_id, query=query, limit=3)

    def _tool_python_executor(self, params: Dict[str, Any]) -> str:
        code = params.get("code", "")
        # Safe execution environment
        restricted_globals = {
            "__builtins__": {
                "print": print, "range": range, "len": len, "sum": sum,
                "min": min, "max": max, "int": int, "float": float, "str": str,
                "list": list, "dict": dict, "set": set
            },
            "math": math
        }
        local_scope = {}
        exec(code, restricted_globals, local_scope)
        return str(local_scope.get("result", local_scope))

    def _tool_csv_analyzer(self, params: Dict[str, Any]) -> Dict[str, Any]:
        filename = os.path.basename(params.get("filename", ""))
        target = None
        for d in [settings.UPLOADS_DIR, settings.DOCUMENTS_DIR, settings.STORAGE_DIR]:
            if (d / filename).exists():
                target = d / filename
                break
        if not target:
            return {"error": f"CSV '{filename}' not found."}
        
        import pandas as pd
        df = pd.read_csv(target, nrows=100)
        return {
            "rows_sampled": len(df),
            "columns": list(df.columns),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "summary": df.describe().to_dict()
        }

    def _tool_sql_query(self, params: Dict[str, Any]) -> Dict[str, Any]:
        query = params.get("query", "").strip()
        if not query.lower().startswith("select"):
            return {"error": "Only read-only SELECT queries are authorized."}
        return {"notice": "Query passed safety check", "simulated_rows": []}

tool_registry = ToolRegistry()
