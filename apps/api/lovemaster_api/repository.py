from __future__ import annotations

from datetime import UTC, datetime
import json
from pathlib import Path
from uuid import uuid4

from .settings import settings


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


class InMemoryRepository:
    def __init__(self) -> None:
        self.users: dict[str, dict] = {}
        self.refresh_tokens: dict[str, dict] = {}
        self.sessions: dict[str, dict] = {}
        self.messages: dict[str, list[dict]] = {}
        self.runs: dict[str, dict] = {}
        self.run_events: dict[str, list[dict]] = {}
        self.knowledge_candidates: dict[str, dict] = {}
        self.feedback_events: dict[str, dict] = {}
        self.strategy_scores: dict[str, dict] = {}
        self.conversation_images: dict[str, list[dict]] = {}

    def create_user(
        self,
        *,
        email: str,
        password_hash: str | None,
        name: str | None,
        google_id: str | None = None,
        avatar_url: str | None = None,
        auth_provider: str = "local",
        needs_password: bool = False,
    ) -> dict:
        user = {
            "id": str(uuid4()),
            "email": email.lower(),
            "passwordHash": password_hash,
            "name": name or email.split("@")[0],
            "googleId": google_id,
            "avatarUrl": avatar_url,
            "authProvider": auth_provider,
            "needsPassword": needs_password,
            "createdAt": now_iso(),
            "updatedAt": now_iso(),
        }
        self.users[user["id"]] = user
        return user

    def find_user_by_email(self, email: str) -> dict | None:
        normalized = email.lower()
        return next((user for user in self.users.values() if user["email"] == normalized), None)

    def find_user_by_id(self, user_id: str) -> dict | None:
        return self.users.get(user_id)

    def update_user_password(self, user_id: str, password_hash: str) -> None:
        if user_id in self.users:
            self.users[user_id]["passwordHash"] = password_hash
            self.users[user_id]["needsPassword"] = False
            self.users[user_id]["updatedAt"] = now_iso()

    def save_refresh_token(self, user_id: str, token: str, expires_at_iso: str) -> None:
        self.refresh_tokens[token] = {
            "id": str(uuid4()),
            "userId": user_id,
            "token": token,
            "expiresAt": expires_at_iso,
            "createdAt": now_iso(),
        }

    def delete_refresh_tokens_for_user(self, user_id: str) -> None:
        for token, row in list(self.refresh_tokens.items()):
            if row["userId"] == user_id:
                self.refresh_tokens.pop(token, None)

    def find_user_by_refresh_token(self, token: str) -> dict | None:
        row = self.refresh_tokens.get(token)
        if not row:
            return None
        return self.find_user_by_id(row["userId"])

    def ensure_conversation(self, *, user_id: str, chat_type: str, chat_id: str, title: str) -> dict:
        if chat_id not in self.sessions:
            self.sessions[chat_id] = {
                "id": chat_id,
                "userId": user_id,
                "chatType": chat_type,
                "title": title[:50] if title else "新的对话",
                "createdAt": now_iso(),
                "updatedAt": now_iso(),
            }
        else:
            self.sessions[chat_id]["updatedAt"] = now_iso()
        return self.sessions[chat_id]

    def list_sessions(self, user_id: str, chat_type: str) -> list[dict]:
        rows = [
            row
            for row in self.sessions.values()
            if row["userId"] == user_id and row["chatType"] == chat_type
        ]
        rows.sort(key=lambda row: row["updatedAt"], reverse=True)
        return [{"id": row["id"], "title": row["title"]} for row in rows]

    def delete_session(self, chat_id: str) -> None:
        self.sessions.pop(chat_id, None)
        self.messages.pop(chat_id, None)

    def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        *,
        image_url: str | None = None,
        probability_json: str | None = None,
    ) -> dict:
        message = {
            "id": str(uuid4()),
            "conversationId": conversation_id,
            "role": role,
            "content": content,
            "createdAt": now_iso(),
        }
        if image_url:
            message["imageUrl"] = image_url
        if probability_json:
            message["probabilityJson"] = probability_json
        self.messages.setdefault(conversation_id, []).append(message)
        return message

    def get_messages(self, conversation_id: str, limit: int = 100) -> list[dict]:
        rows = self.messages.get(conversation_id, [])[-limit:]
        result = []
        for row in rows:
            item = {"role": row["role"], "content": row["content"]}
            if row.get("imageUrl"):
                item["imageUrl"] = row["imageUrl"]
            if row.get("probabilityJson"):
                item["probability"] = row["probabilityJson"]
            result.append(item)
        return result

    def create_run(
        self,
        *,
        user_id: str,
        chat_id: str,
        chat_type: str,
        request_message: str,
        image_url: str | None,
    ) -> dict:
        run = {
            "id": str(uuid4()),
            "runId": None,
            "userId": user_id,
            "chatId": chat_id,
            "chatType": chat_type,
            "status": "QUEUED",
            "requestMessage": request_message,
            "imageUrl": image_url,
            "lastEventType": None,
            "latestStatusText": "",
            "partialResponse": "",
            "errorMessage": None,
            "createdAt": now_iso(),
            "updatedAt": now_iso(),
            "startedAt": None,
            "finishedAt": None,
        }
        run["runId"] = run["id"]
        self.runs[run["id"]] = run
        return run

    def append_run_content(self, run_id: str, chunk: str) -> None:
        if run_id in self.runs:
            self.runs[run_id]["status"] = "RUNNING"
            self.runs[run_id]["partialResponse"] += chunk
            self.runs[run_id]["lastEventType"] = "content"
            self.runs[run_id]["updatedAt"] = now_iso()

    def complete_run(self, run_id: str, content: str | None) -> None:
        if run_id in self.runs:
            self.runs[run_id]["status"] = "COMPLETED"
            if content is not None:
                self.runs[run_id]["partialResponse"] = content
            self.runs[run_id]["lastEventType"] = "done"
            self.runs[run_id]["finishedAt"] = now_iso()
            self.runs[run_id]["updatedAt"] = now_iso()

    def fail_run(self, run_id: str, error_message: str) -> None:
        if run_id in self.runs:
            self.runs[run_id]["status"] = "FAILED"
            self.runs[run_id]["errorMessage"] = error_message
            self.runs[run_id]["lastEventType"] = "error"
            self.runs[run_id]["finishedAt"] = now_iso()
            self.runs[run_id]["updatedAt"] = now_iso()

    def list_active_runs(self, user_id: str) -> list[dict]:
        return [
            run
            for run in self.runs.values()
            if run["userId"] == user_id and run["status"] in {"QUEUED", "RUNNING"}
        ]

    def get_run(self, run_id: str) -> dict | None:
        return self.runs.get(run_id)

    def create_knowledge_candidate(self, user_id: str, payload: dict) -> dict:
        candidate_id = str(uuid4())
        candidate = {
            "id": candidate_id,
            "userId": user_id,
            "sourceChatId": payload.get("chatId"),
            "sourceRunId": payload.get("runId"),
            "rawQuestion": payload.get("question") or "",
            "rawAnswer": payload.get("answer") or "",
            "abstractSummary": payload.get("answer") or payload.get("question") or "",
            "triggerType": payload.get("triggerType") or "manual",
            "triggerScore": float(payload.get("triggerScore") or 1.0),
            "status": payload.get("status") or "pending_review",
            "stage": payload.get("stage"),
            "intent": payload.get("intent"),
            "problem": payload.get("problem"),
            "createdAt": now_iso(),
        }
        self.knowledge_candidates[candidate_id] = candidate
        return candidate

    def list_knowledge_candidates(self, status: str, page: int, size: int) -> list[dict]:
        rows = [row for row in self.knowledge_candidates.values() if row.get("status") == status]
        rows.sort(key=lambda row: row["createdAt"], reverse=True)
        start = max(0, page) * max(1, size)
        return rows[start : start + max(1, size)]

    def update_candidate_status(self, candidate_id: str, status: str, reviewer_id: str, note: str | None = None) -> dict | None:
        candidate = self.knowledge_candidates.get(candidate_id)
        if not candidate:
            return None
        candidate["status"] = status
        candidate["reviewerId"] = reviewer_id
        if note:
            candidate["reviewNote"] = note
        candidate["reviewedAt"] = now_iso()
        return candidate

    def create_feedback_event(self, user_id: str, payload: dict) -> dict:
        event_id = str(uuid4())
        event = {
            "id": event_id,
            "userId": user_id,
            "candidateId": payload.get("candidateId"),
            "chatId": payload.get("chatId"),
            "runId": payload.get("runId"),
            "eventType": payload.get("eventType"),
            "eventValue": payload.get("eventValue"),
            "eventScore": float(payload.get("eventScore") or 1.0),
            "meta": payload.get("meta") or {},
            "createdAt": now_iso(),
        }
        self.feedback_events[event_id] = event
        return event

    def list_strategy_scores(self, topic_key: str | None, limit: int) -> list[dict]:
        rows = list(self.strategy_scores.values())
        if topic_key:
            rows = [row for row in rows if row.get("topicKey") == topic_key]
        rows.sort(key=lambda row: row.get("rankScore", 0), reverse=True)
        return rows[: max(1, limit)]

    def add_conversation_image(
        self,
        *,
        conversation_id: str,
        file_name: str,
        file_type: str,
        public_url: str,
        storage_path: str | None = None,
        source_url: str | None = None,
    ) -> dict:
        row = {
            "id": str(uuid4()),
            "conversationId": conversation_id,
            "fileName": file_name,
            "fileType": file_type,
            "publicUrl": public_url,
            "storagePath": storage_path,
            "sourceUrl": source_url,
            "createdAt": now_iso(),
        }
        self.conversation_images.setdefault(conversation_id, []).append(row)
        return row

    def list_conversation_images(self, conversation_id: str) -> list[dict]:
        return [
            {
                "type": row.get("fileType") or "image",
                "name": row.get("fileName") or "",
                "url": row.get("publicUrl") or "",
            }
            for row in self.conversation_images.get(conversation_id, [])
        ]


class PostgresRepository(InMemoryRepository):
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url
        self._ensure_schema()

    def _connect(self):
        import psycopg

        return psycopg.connect(self.database_url)

    def _ensure_schema(self) -> None:
        migration_path = Path(__file__).resolve().parents[1] / "migrations" / "001_initial_schema.sql"
        sql = migration_path.read_text(encoding="utf-8")
        with self._connect() as conn:
            conn.execute(sql)

    def create_user(
        self,
        *,
        email: str,
        password_hash: str | None,
        name: str | None,
        google_id: str | None = None,
        avatar_url: str | None = None,
        auth_provider: str = "local",
        needs_password: bool = False,
    ) -> dict:
        user_id = str(uuid4())
        display_name = name or email.split("@")[0]
        with self._connect() as conn:
            conn.execute(
                """
                insert into users
                  (id, email, password_hash, name, google_id, avatar_url, auth_provider, needs_password)
                values (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (user_id, email.lower(), password_hash, display_name, google_id, avatar_url, auth_provider, needs_password),
            )
        return self.find_user_by_id(user_id)

    def find_user_by_email(self, email: str) -> dict | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                select id, email, password_hash, name, google_id, avatar_url, auth_provider, needs_password
                from users where email = %s
                """,
                (email.lower(),),
            ).fetchone()
        return self._user_from_row(row)

    def find_user_by_id(self, user_id: str) -> dict | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                select id, email, password_hash, name, google_id, avatar_url, auth_provider, needs_password
                from users where id = %s
                """,
                (user_id,),
            ).fetchone()
        return self._user_from_row(row)

    def update_user_password(self, user_id: str, password_hash: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "update users set password_hash = %s, needs_password = false, updated_at = now() where id = %s",
                (password_hash, user_id),
            )

    def save_refresh_token(self, user_id: str, token: str, expires_at_iso: str) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                insert into refresh_tokens (id, user_id, token, expires_at)
                values (%s, %s, %s, %s)
                on conflict (token) do update set user_id = excluded.user_id, expires_at = excluded.expires_at
                """,
                (str(uuid4()), user_id, token, expires_at_iso),
            )

    def delete_refresh_tokens_for_user(self, user_id: str) -> None:
        with self._connect() as conn:
            conn.execute("delete from refresh_tokens where user_id = %s", (user_id,))

    def find_user_by_refresh_token(self, token: str) -> dict | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                select u.id, u.email, u.password_hash, u.name, u.google_id, u.avatar_url, u.auth_provider, u.needs_password
                from refresh_tokens rt
                join users u on u.id = rt.user_id
                where rt.token = %s and rt.expires_at > now()
                """,
                (token,),
            ).fetchone()
        return self._user_from_row(row)

    def ensure_conversation(self, *, user_id: str, chat_type: str, chat_id: str, title: str) -> dict:
        with self._connect() as conn:
            conn.execute(
                """
                insert into conversations (id, user_id, chat_type, title)
                values (%s, %s, %s, %s)
                on conflict (id) do update set updated_at = now()
                """,
                (chat_id, user_id, chat_type, title[:50] if title else "新的对话"),
            )
            row = conn.execute(
                "select id, user_id, chat_type, title from conversations where id = %s",
                (chat_id,),
            ).fetchone()
        return {"id": row[0], "userId": row[1], "chatType": row[2], "title": row[3]}

    def list_sessions(self, user_id: str, chat_type: str) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                select id, title from conversations
                where user_id = %s and chat_type = %s
                order by updated_at desc
                """,
                (user_id, chat_type),
            ).fetchall()
        return [{"id": row[0], "title": row[1]} for row in rows]

    def delete_session(self, chat_id: str) -> None:
        with self._connect() as conn:
            conn.execute("delete from conversations where id = %s", (chat_id,))

    def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        *,
        image_url: str | None = None,
        probability_json: str | None = None,
    ) -> dict:
        message_id = str(uuid4())
        with self._connect() as conn:
            conn.execute(
                """
                insert into messages (id, conversation_id, role, content, image_url, probability_json)
                values (%s, %s, %s, %s, %s, %s)
                """,
                (message_id, conversation_id, role, content, image_url, probability_json),
            )
        return {
            "id": message_id,
            "conversationId": conversation_id,
            "role": role,
            "content": content,
            **({"imageUrl": image_url} if image_url else {}),
            **({"probabilityJson": probability_json} if probability_json else {}),
        }

    def get_messages(self, conversation_id: str, limit: int = 100) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                select role, content, image_url, probability_json from messages
                where conversation_id = %s
                order by created_at asc
                limit %s
                """,
                (conversation_id, limit),
            ).fetchall()
        result = []
        for role, content, image_url, probability_json in rows:
            item = {"role": role, "content": content}
            if image_url:
                item["imageUrl"] = image_url
            if probability_json:
                item["probability"] = probability_json
            result.append(item)
        return result

    def create_run(
        self,
        *,
        user_id: str,
        chat_id: str,
        chat_type: str,
        request_message: str,
        image_url: str | None,
    ) -> dict:
        run_id = str(uuid4())
        with self._connect() as conn:
            conn.execute(
                """
                insert into chat_runs (id, user_id, chat_id, chat_type, status, request_message, image_url)
                values (%s, %s, %s, %s, 'QUEUED', %s, %s)
                """,
                (run_id, user_id, chat_id, chat_type, request_message, image_url),
            )
        return self.get_run(run_id)

    def append_run_content(self, run_id: str, chunk: str) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                update chat_runs
                set status = 'RUNNING',
                    partial_response = coalesce(partial_response, '') || %s,
                    last_event_type = 'content',
                    updated_at = now()
                where id = %s
                """,
                (chunk, run_id),
            )

    def complete_run(self, run_id: str, content: str | None) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                update chat_runs
                set status = 'COMPLETED',
                    partial_response = coalesce(%s, partial_response),
                    last_event_type = 'done',
                    finished_at = now(),
                    updated_at = now()
                where id = %s
                """,
                (content, run_id),
            )

    def fail_run(self, run_id: str, error_message: str) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                update chat_runs
                set status = 'FAILED',
                    error_message = %s,
                    last_event_type = 'error',
                    finished_at = now(),
                    updated_at = now()
                where id = %s
                """,
                (error_message, run_id),
            )

    def list_active_runs(self, user_id: str) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                select id, user_id, chat_id, chat_type, status, request_message, image_url,
                       last_event_type, latest_status_text, partial_response, error_message
                from chat_runs
                where user_id = %s and status in ('QUEUED', 'RUNNING')
                order by created_at desc
                """,
                (user_id,),
            ).fetchall()
        return [self._run_from_row(row) for row in rows]

    def get_run(self, run_id: str) -> dict | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                select id, user_id, chat_id, chat_type, status, request_message, image_url,
                       last_event_type, latest_status_text, partial_response, error_message
                from chat_runs where id = %s
                """,
                (run_id,),
            ).fetchone()
        return self._run_from_row(row)

    def _user_from_row(self, row) -> dict | None:
        if not row:
            return None
        return {
            "id": row[0],
            "email": row[1],
            "passwordHash": row[2],
            "name": row[3],
            "googleId": row[4],
            "avatarUrl": row[5],
            "authProvider": row[6],
            "needsPassword": row[7],
        }

    def _run_from_row(self, row) -> dict | None:
        if not row:
            return None
        return {
            "id": row[0],
            "runId": row[0],
            "userId": row[1],
            "chatId": row[2],
            "chatType": row[3],
            "status": row[4],
            "requestMessage": row[5],
            "imageUrl": row[6],
            "lastEventType": row[7],
            "latestStatusText": row[8] or "",
            "partialResponse": row[9] or "",
            "errorMessage": row[10],
        }

    def create_knowledge_candidate(self, user_id: str, payload: dict) -> dict:
        candidate_id = str(uuid4())
        values = (
            candidate_id,
            user_id,
            payload.get("chatId"),
            payload.get("runId"),
            payload.get("question") or "",
            payload.get("answer") or "",
            payload.get("answer") or payload.get("question") or "",
            payload.get("triggerType") or "manual",
            float(payload.get("triggerScore") or 1.0),
            payload.get("status") or "pending_review",
            payload.get("stage"),
            payload.get("intent"),
            payload.get("problem"),
        )
        with self._connect() as conn:
            conn.execute(
                """
                insert into wiki_candidates
                  (id, user_id, source_chat_id, source_run_id, raw_question, raw_answer, abstract_summary,
                   trigger_type, trigger_score, status, stage, intent, problem)
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                values,
            )
        return self.list_knowledge_candidates(payload.get("status") or "pending_review", 0, 1)[0]

    def list_knowledge_candidates(self, status: str, page: int, size: int) -> list[dict]:
        offset = max(0, page) * max(1, size)
        with self._connect() as conn:
            rows = conn.execute(
                """
                select id, stage, intent, problem, abstract_summary, trigger_type, trigger_score,
                       status, created_at, raw_question, raw_answer, reviewer_id, review_note
                from wiki_candidates
                where status = %s
                order by created_at desc
                limit %s offset %s
                """,
                (status, max(1, size), offset),
            ).fetchall()
        return [self._candidate_from_row(row) for row in rows]

    def update_candidate_status(self, candidate_id: str, status: str, reviewer_id: str, note: str | None = None) -> dict | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                update wiki_candidates
                set status = %s, reviewer_id = %s, review_note = %s, reviewed_at = now()
                where id = %s
                returning id, stage, intent, problem, abstract_summary, trigger_type, trigger_score,
                          status, created_at, raw_question, raw_answer, reviewer_id, review_note
                """,
                (status, reviewer_id, note, candidate_id),
            ).fetchone()
        return self._candidate_from_row(row)

    def create_feedback_event(self, user_id: str, payload: dict) -> dict:
        event_id = str(uuid4())
        with self._connect() as conn:
            conn.execute(
                """
                insert into wiki_feedback_events
                  (id, user_id, candidate_id, chat_id, run_id, event_type, event_value, event_score, meta)
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
                """,
                (
                    event_id,
                    user_id,
                    payload.get("candidateId"),
                    payload.get("chatId"),
                    payload.get("runId"),
                    payload.get("eventType"),
                    payload.get("eventValue"),
                    float(payload.get("eventScore") or 1.0),
                    json.dumps(payload.get("meta") or {}, ensure_ascii=False),
                ),
            )
        return {"id": event_id, "userId": user_id, **payload}

    def list_strategy_scores(self, topic_key: str | None, limit: int) -> list[dict]:
        where = "where topic_key = %s" if topic_key else ""
        params = (topic_key, max(1, limit)) if topic_key else (max(1, limit),)
        with self._connect() as conn:
            rows = conn.execute(
                f"""
                select id, topic_key, strategy_id, sample_count, positive_rate, continue_rate,
                       confidence, rank_score, gray_enabled, computed_at
                from wiki_strategy_scores
                {where}
                order by rank_score desc
                limit %s
                """,
                params,
            ).fetchall()
        return [
            {
                "id": row[0],
                "topicKey": row[1],
                "strategyId": row[2],
                "sampleCount": row[3],
                "positiveRate": row[4],
                "continueRate": row[5],
                "confidence": row[6],
                "rankScore": row[7],
                "grayEnabled": row[8],
                "computedAt": row[9].isoformat() if row[9] else None,
            }
            for row in rows
        ]

    def _candidate_from_row(self, row) -> dict | None:
        if not row:
            return None
        return {
            "id": row[0],
            "stage": row[1],
            "intent": row[2],
            "problem": row[3],
            "abstractSummary": row[4],
            "triggerType": row[5],
            "triggerScore": row[6],
            "status": row[7],
            "createdAt": row[8].isoformat() if row[8] else None,
            "rawQuestion": row[9],
            "rawAnswer": row[10],
            "reviewerId": row[11],
            "reviewNote": row[12],
        }

    def add_conversation_image(
        self,
        *,
        conversation_id: str,
        file_name: str,
        file_type: str,
        public_url: str,
        storage_path: str | None = None,
        source_url: str | None = None,
    ) -> dict:
        image_id = str(uuid4())
        with self._connect() as conn:
            conn.execute(
                """
                insert into conversation_images
                  (id, conversation_id, file_name, file_type, public_url, storage_path, source_url)
                values (%s, %s, %s, %s, %s, %s, %s)
                """,
                (image_id, conversation_id, file_name, file_type, public_url, storage_path, source_url),
            )
        return {
            "id": image_id,
            "conversationId": conversation_id,
            "fileName": file_name,
            "fileType": file_type,
            "publicUrl": public_url,
            "storagePath": storage_path,
            "sourceUrl": source_url,
        }

    def list_conversation_images(self, conversation_id: str) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                select file_type, file_name, public_url from conversation_images
                where conversation_id = %s
                order by created_at asc
                """,
                (conversation_id,),
            ).fetchall()
        return [
            {"type": row[0] or "image", "name": row[1] or "", "url": row[2] or ""}
            for row in rows
        ]


def create_repository():
    database_url = settings.effective_database_url
    if database_url:
        return PostgresRepository(database_url)
    return InMemoryRepository()


repository = create_repository()
