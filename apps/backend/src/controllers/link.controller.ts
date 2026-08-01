import type { RequestHandler } from "express";
import { unauthorized } from "../errors/AppError.js";
import {
  parseCreateLinkBody,
  parseLinkId,
  parsePagination,
  parseStatsDays,
} from "../schemas/link.schema.js";
import type { LinkService } from "../services/link.service.js";
import { MAX_ALIAS_LENGTH, MIN_ALIAS_LENGTH } from "../utils/alias.js";
import { parseClickContext } from "../utils/clickContext.js";

export interface LinkControllerDeps {
  service: LinkService;
  logger?: Pick<Console, "error">;
}

const SHORT_CODE_PATTERN = new RegExp(
  `^[0-9a-zA-Z_-]{${MIN_ALIAS_LENGTH},${MAX_ALIAS_LENGTH}}$`,
);

export function createLinkController(deps: LinkControllerDeps) {
  const logger = deps.logger ?? console;

  let clickWriteErrors = 0;

  function requireUser(user: { id: number } | undefined): number {
    if (user === undefined) {
      throw unauthorized("You need to sign in to do that.");
    }
    return user.id;
  }

  const create: RequestHandler = async (req, res) => {
    const body = parseCreateLinkBody(req.body);

    const link = await deps.service.createLink({
      url: body.url,
      alias: body.alias,
      expiresAt: body.expiresAt,
      userId: req.user?.id ?? null,
    });

    res.status(201).json(link);
  };

  const list: RequestHandler = async (req, res) => {
    const userId = requireUser(req.user);
    const { page, pageSize } = parsePagination(req.query);

    res.json(await deps.service.listLinks(userId, page, pageSize));
  };

  const remove: RequestHandler = async (req, res) => {
    const userId = requireUser(req.user);
    const id = parseLinkId(req.params.id);

    await deps.service.deleteLink(id, userId);
    res.status(204).end();
  };

  const stats: RequestHandler = async (req, res) => {
    const userId = requireUser(req.user);
    const id = parseLinkId(req.params.id);
    const days = parseStatsDays(req.query);

    res.json(await deps.service.getStats(id, userId, days));
  };

  const redirect: RequestHandler = async (req, res, next) => {
    const code = req.params.code;

    if (typeof code !== "string" || !SHORT_CODE_PATTERN.test(code)) {
      next();
      return;
    }

    const target = await deps.service.resolveForRedirect(code);

    const context = parseClickContext({
      userAgent: req.get("user-agent"),
      referer: req.get("referer"),
    });

    res.setHeader("Cache-Control", "no-store, max-age=0");

    res.redirect(302, target.targetUrl);

    deps.service.recordClick(target.id, context).catch((error: unknown) => {
      clickWriteErrors++;
      logger.error("[snipp] click write failed:", error);
    });
  };

  return {
    create,
    list,
    remove,
    stats,
    redirect,
    metrics: () => ({ clickWriteErrors }),
  };
}
