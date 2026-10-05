import { Request, Response, NextFunction } from "express";
import { billingService } from "../services/billing.service.js";
import { AuthRequest } from "../lib/auth.js";

function actorFrom(req: Request) {
  return (
    (req as AuthRequest).auth ?? {
      sub: "",
      email: "",
      email_verified: false,
      role: "",
      hotel_id: null,
      scope: "global" as const,
      iss: "",
      aud: "",
      iat: 0,
      exp: 0,
    }
  );
}

export class BillingController {
  async listFolios(req: Request, res: Response, next: NextFunction) {
    try {
      const folios = await billingService.listFolios(
        req.query as never,
        actorFrom(req)
      );
      res.json(folios);
    } catch (err) {
      next(err);
    }
  }

  async getFolio(req: Request, res: Response, next: NextFunction) {
    try {
      const folio = await billingService.getFolio(
        req.params.id as string,
        actorFrom(req)
      );
      res.json(folio);
    } catch (err) {
      next(err);
    }
  }

  async getFolioByBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const folio = await billingService.getFolioByBooking(
        req.params.bookingId as string,
        actorFrom(req)
      );
      res.json(folio);
    } catch (err) {
      next(err);
    }
  }

  async addCharge(req: Request, res: Response, next: NextFunction) {
    try {
      const { folio_id, ...charge } = req.body as {
        folio_id: string;
        concept: string;
        amount: number;
        category?: "room" | "minibar" | "spa" | "restaurant" | "other";
      };
      const created = await billingService.addCharge(
        folio_id,
        charge,
        actorFrom(req)
      );
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }

  async listFoliosByGuest(req: Request, res: Response, next: NextFunction) {
    try {
      const folios = await billingService.listFoliosByGuest(
        req.params.id as string,
        actorFrom(req)
      );
      res.json(folios);
    } catch (err) {
      next(err);
    }
  }

  async closeFolio(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await billingService.closeFolioAsActor(
        req.params.id as string,
        actorFrom(req),
        req.body
      );
      res.json(invoice);
    } catch (err) {
      next(err);
    }
  }

  async listInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const invoices = await billingService.listInvoices(
        req.query as never,
        actorFrom(req)
      );
      res.json(invoices);
    } catch (err) {
      next(err);
    }
  }

  async getInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await billingService.getInvoice(
        req.params.id as string,
        actorFrom(req)
      );
      res.json(invoice);
    } catch (err) {
      next(err);
    }
  }
}

export const billingController = new BillingController();
