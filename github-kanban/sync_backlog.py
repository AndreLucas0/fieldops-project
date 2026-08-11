#!/usr/bin/env python3
"""
sync_backlog.py — Sincroniza um backlog.yaml com GitHub Issues + Projects v2.

Uso:
    export GITHUB_TOKEN=ghp_xxx     # PAT com escopos: repo, project
    python sync_backlog.py --file backlog.yaml
    python sync_backlog.py --file backlog.yaml --dry-run

Idempotência:
    Cada item do YAML tem um ID (EP-01, US-01, TS-01-01). O script usa esse ID
    como prefixo no título da issue (ex.: "[US-01] Login com email e senha").
    Rodar de novo NÃO cria duplicatas — atualiza o que já existe.
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from dataclasses import dataclass, field
from typing import Any

import requests
import yaml

GITHUB_API = "https://api.github.com/graphql"


# ---------------------------------------------------------------------------
# GraphQL helper
# ---------------------------------------------------------------------------
def gql(query: str, variables: dict, token: str) -> dict:
    r = requests.post(
        GITHUB_API,
        json={"query": query, "variables": variables},
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    if "errors" in data:
        raise RuntimeError(f"GraphQL errors: {data['errors']}")
    return data["data"]


# ---------------------------------------------------------------------------
# Metadata: project id, repo id, field ids, option ids, iteration ids
# ---------------------------------------------------------------------------
@dataclass
class ProjectMeta:
    project_id: str
    repo_id: str
    # field name -> field metadata (id + optional options/iterations)
    fields: dict[str, dict] = field(default_factory=dict)


def fetch_project_meta(owner: str, repo: str, project_number: int, token: str) -> ProjectMeta:
    """Descobre IDs do projeto, do repo, dos campos, das opções e das iterations."""
    query = """
    query($owner:String!, $repo:String!, $number:Int!) {
      repository(owner:$owner, name:$repo) { id }
      user(login:$owner) {
        projectV2(number:$number) {
          id
          fields(first:50) {
            nodes {
              ... on ProjectV2Field { id name dataType }
              ... on ProjectV2SingleSelectField {
                id name dataType
                options { id name }
              }
              ... on ProjectV2IterationField {
                id name dataType
                configuration {
                  iterations { id title }
                  completedIterations { id title }
                }
              }
            }
          }
        }
      }
      organization(login:$owner) {
        projectV2(number:$number) {
          id
          fields(first:50) {
            nodes {
              ... on ProjectV2Field { id name dataType }
              ... on ProjectV2SingleSelectField {
                id name dataType
                options { id name }
              }
              ... on ProjectV2IterationField {
                id name dataType
                configuration {
                  iterations { id title }
                  completedIterations { id title }
                }
              }
            }
          }
        }
      }
    }
    """
    data = gql(query, {"owner": owner, "repo": repo, "number": project_number}, token)
    repo_id = data["repository"]["id"]

    # Owner pode ser user ou org — pega o que vier preenchido.
    project = None
    if data.get("user") and data["user"].get("projectV2"):
        project = data["user"]["projectV2"]
    elif data.get("organization") and data["organization"].get("projectV2"):
        project = data["organization"]["projectV2"]
    if not project:
        raise RuntimeError(f"Project {project_number} não encontrado em {owner}")

    fields_map: dict[str, dict] = {}
    for f in project["fields"]["nodes"]:
        if not f:
            continue
        entry = {"id": f["id"], "dataType": f["dataType"]}
        if "options" in f:
            entry["options"] = {o["name"]: o["id"] for o in f["options"]}
        if "configuration" in f and f["configuration"]:
            iters = f["configuration"].get("iterations", []) + \
                    f["configuration"].get("completedIterations", [])
            entry["iterations"] = {i["title"]: i["id"] for i in iters}
        fields_map[f["name"]] = entry

    return ProjectMeta(project_id=project["id"], repo_id=repo_id, fields=fields_map)


# ---------------------------------------------------------------------------
# Existing issues lookup (by ID prefix in title)
# ---------------------------------------------------------------------------
def fetch_existing_issues(owner: str, repo: str, token: str) -> dict[str, dict]:
    """Retorna dict {ID: {issue_id, number, title, project_item_id?}} das issues
    que já têm prefixo de ID (EP-, US-, TS-)."""
    result: dict[str, dict] = {}
    cursor = None
    query = """
    query($owner:String!, $repo:String!, $cursor:String) {
      repository(owner:$owner, name:$repo) {
        issues(first:100, after:$cursor, states:[OPEN,CLOSED]) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id number title
            projectItems(first:10) { nodes { id project { id } } }
          }
        }
      }
    }
    """
    while True:
        data = gql(query, {"owner": owner, "repo": repo, "cursor": cursor}, token)
        issues = data["repository"]["issues"]
        for i in issues["nodes"]:
            title = i["title"]
            if title.startswith("[") and "]" in title:
                item_id = title[1:title.index("]")]
                if item_id.split("-")[0] in ("EP", "US", "TS"):
                    result[item_id] = {
                        "issue_id": i["id"],
                        "number": i["number"],
                        "title": title,
                        "project_items": i["projectItems"]["nodes"],
                    }
        if not issues["pageInfo"]["hasNextPage"]:
            break
        cursor = issues["pageInfo"]["endCursor"]
    return result


# ---------------------------------------------------------------------------
# Mutations
# ---------------------------------------------------------------------------
def create_issue(repo_id: str, title: str, body: str, token: str) -> dict:
    query = """
    mutation($repoId:ID!, $title:String!, $body:String!) {
      createIssue(input:{repositoryId:$repoId, title:$title, body:$body}) {
        issue { id number }
      }
    }
    """
    d = gql(query, {"repoId": repo_id, "title": title, "body": body}, token)
    return d["createIssue"]["issue"]


def update_issue(issue_id: str, title: str, body: str, token: str) -> None:
    query = """
    mutation($id:ID!, $title:String!, $body:String!) {
      updateIssue(input:{id:$id, title:$title, body:$body}) { issue { id } }
    }
    """
    gql(query, {"id": issue_id, "title": title, "body": body}, token)


def add_to_project(project_id: str, issue_id: str, token: str) -> str:
    query = """
    mutation($projectId:ID!, $contentId:ID!) {
      addProjectV2ItemById(input:{projectId:$projectId, contentId:$contentId}) {
        item { id }
      }
    }
    """
    d = gql(query, {"projectId": project_id, "contentId": issue_id}, token)
    return d["addProjectV2ItemById"]["item"]["id"]


def set_field(
    project_id: str, item_id: str, field_meta: dict, value: Any, token: str
) -> None:
    """Seta um campo baseado no dataType (TEXT, NUMBER, SINGLE_SELECT, ITERATION)."""
    dt = field_meta["dataType"]
    if dt == "TEXT":
        val = {"text": str(value)}
    elif dt == "NUMBER":
        val = {"number": float(value)}
    elif dt == "SINGLE_SELECT":
        opt_id = field_meta.get("options", {}).get(str(value))
        if not opt_id:
            print(f"  ⚠ opção '{value}' não existe no campo (opções: "
                  f"{list(field_meta.get('options', {}).keys())})")
            return
        val = {"singleSelectOptionId": opt_id}
    elif dt == "ITERATION":
        it_id = field_meta.get("iterations", {}).get(str(value))
        if not it_id:
            print(f"  ⚠ iteration '{value}' não existe")
            return
        val = {"iterationId": it_id}
    else:
        print(f"  ⚠ dataType {dt} não suportado, pulando")
        return

    query = """
    mutation($projectId:ID!, $itemId:ID!, $fieldId:ID!, $value:ProjectV2FieldValue!) {
      updateProjectV2ItemFieldValue(input:{
        projectId:$projectId, itemId:$itemId, fieldId:$fieldId, value:$value
      }) { projectV2Item { id } }
    }
    """
    gql(query, {
        "projectId": project_id,
        "itemId": item_id,
        "fieldId": field_meta["id"],
        "value": val,
    }, token)


# ---------------------------------------------------------------------------
# Flatten YAML → lista de items
# ---------------------------------------------------------------------------
@dataclass
class Item:
    id: str
    type: str          # "Epic" | "User Story" | "Task"
    title: str
    body: str
    fields: dict       # nome_do_campo -> valor (usa fields_map do YAML)


def build_epic_body(epic: dict) -> str:
    parts = [epic.get("description", "").strip()]
    if epic.get("user_stories"):
        parts.append("\n### User Stories\n")
        for us in epic["user_stories"]:
            parts.append(f"- [{us['id']}] {us['title']}")
    return "\n".join(p for p in parts if p)


def build_us_body(us: dict, epic_id: str) -> str:
    parts = [f"**Épico:** {epic_id}\n", us.get("story", "").strip()]
    ac = us.get("acceptance_criteria", [])
    if ac:
        parts.append("\n### Critérios de aceitação")
        for c in ac:
            parts.append(f"- [ ] {c}")
    if us.get("tasks"):
        parts.append("\n### Tasks")
        for t in us["tasks"]:
            parts.append(f"- [ ] [{t['id']}] {t['title']}")
    return "\n".join(parts)


def build_task_body(task: dict, us_id: str, epic_id: str) -> str:
    return (
        f"**Épico:** {epic_id}\n"
        f"**User Story:** {us_id}\n\n"
        f"{task.get('description', '').strip()}"
    ).strip()


def flatten(backlog: dict) -> list[Item]:
    items: list[Item] = []
    for epic in backlog.get("epics", []):
        items.append(Item(
            id=epic["id"],
            type="Epic",
            title=f"[{epic['id']}] {epic['name']}",
            body=build_epic_body(epic),
            fields={
                "type": "Epic",
                "priority": epic.get("priority"),
                "iteration": epic.get("iteration"),
            },
        ))
        for us in epic.get("user_stories", []):
            items.append(Item(
                id=us["id"],
                type="User Story",
                title=f"[{us['id']}] {us['title']}",
                body=build_us_body(us, epic["id"]),
                fields={
                    "type": "User Story",
                    "priority": us.get("priority"),
                    "story_points": us.get("story_points"),
                    "iteration": us.get("iteration"),
                    "epic": epic["id"],
                },
            ))
            for task in us.get("tasks", []):
                items.append(Item(
                    id=task["id"],
                    type="Task",
                    title=f"[{task['id']}] {task['title']}",
                    body=build_task_body(task, us["id"], epic["id"]),
                    fields={
                        "type": "Task",
                        "priority": task.get("priority"),
                        "story_points": task.get("story_points"),
                        "iteration": task.get("iteration"),
                        "epic": epic["id"],
                    },
                ))
    return items


# ---------------------------------------------------------------------------
# Main sync loop
# ---------------------------------------------------------------------------
def sync(backlog: dict, token: str, dry_run: bool = False) -> None:
    p = backlog["project"]
    owner, repo, number = p["owner"], p["repo"], p["project_number"]
    field_names = backlog["fields"]           # logical -> nome no Project
    defaults = backlog.get("defaults", {})

    print(f"→ Buscando metadados de {owner}/{repo} project #{number}...")
    meta = fetch_project_meta(owner, repo, number, token)
    print(f"  ✓ project_id={meta.project_id[:15]}...")
    print(f"  ✓ campos disponíveis: {list(meta.fields.keys())}")

    print("→ Buscando issues existentes...")
    existing = fetch_existing_issues(owner, repo, token)
    print(f"  ✓ {len(existing)} issues com prefixo de ID encontradas")

    items = flatten(backlog)
    print(f"→ {len(items)} itens no backlog: "
          f"{sum(1 for i in items if i.type=='Epic')} épicos, "
          f"{sum(1 for i in items if i.type=='User Story')} US, "
          f"{sum(1 for i in items if i.type=='Task')} tasks")

    created = updated = 0
    for item in items:
        prefix = "DRY" if dry_run else " → "
        if item.id in existing:
            issue_id = existing[item.id]["issue_id"]
            print(f"{prefix} [{item.id}] atualizando #{existing[item.id]['number']}")
            if not dry_run:
                update_issue(issue_id, item.title, item.body, token)
            updated += 1
            # garante que está no projeto
            project_item_id = None
            for pi in existing[item.id]["project_items"]:
                if pi["project"]["id"] == meta.project_id:
                    project_item_id = pi["id"]
                    break
            if not project_item_id and not dry_run:
                project_item_id = add_to_project(meta.project_id, issue_id, token)
        else:
            print(f"{prefix} [{item.id}] criando: {item.title}")
            if dry_run:
                created += 1
                continue
            issue = create_issue(meta.repo_id, item.title, item.body, token)
            issue_id = issue["id"]
            project_item_id = add_to_project(meta.project_id, issue_id, token)
            created += 1

        if dry_run or not project_item_id:
            continue

        # Aplica campos customizados
        field_values = dict(item.fields)
        # status default só na criação
        if item.id not in existing and defaults.get("status"):
            field_values["status"] = defaults["status"]

        for logical_name, value in field_values.items():
            if value is None:
                continue
            project_field_name = field_names.get(logical_name)
            if not project_field_name:
                continue
            field_meta = meta.fields.get(project_field_name)
            if not field_meta:
                print(f"    ⚠ campo '{project_field_name}' não existe no projeto")
                continue
            set_field(meta.project_id, project_item_id, field_meta, value, token)

        # Pequena pausa pra não estressar rate limit
        time.sleep(0.15)

    orphans = set(existing) - {i.id for i in items}
    if orphans:
        print(f"\n⚠ Órfãs (issues com ID que sumiram do YAML): {sorted(orphans)}")
        print("  Nada foi apagado. Feche/arquive manualmente se quiser.")

    print(f"\n✓ Feito. Criados: {created} | Atualizados: {updated}"
          + (" (dry-run — nada foi persistido)" if dry_run else ""))


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", default="backlog.yaml")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        print("ERRO: defina GITHUB_TOKEN (PAT com escopos 'repo' + 'project')",
              file=sys.stderr)
        return 1

    with open(args.file, encoding="utf-8") as f:
        backlog = yaml.safe_load(f)

    sync(backlog, token, dry_run=args.dry_run)
    return 0


if __name__ == "__main__":
    sys.exit(main())
