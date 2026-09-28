import { Request, Response, NextFunction } from "express";
import { billingService } from "../services/billing.service.js";

export class BillingController {
  async listFolios(req: Request, res: Response, next: NextFunction) {
    try {
      const folios = await billingService.listFolios(req.query as never);
      res.json(folios);
    } catch (err) {
      next(err);
    }
  }

  async getFolio(req: Request, res: Response, next: NextFunction) {
    try {
      const folio = await billingService.getFolio(req.params.id as string);
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
      const created = await billingService.addCharge(folio_id, charge);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }

  async listFoliosByGuest(req: Request, res: Response, next: NextFunction) {
    try {
      const folios = await billingService.listFoliosByGuest(
        req.params.id as string
      );
      res.json(folios);
    } catch (err) {
      next(err);
    }
  }

  async closeFolio(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await billingService.closeFolio(
        req.params.id as string,
        req.body
      );
      res.json(invoice);
    } catch (err) {
      next(err);
    }
  }

  async listInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const invoices = await billingService.listInvoices(req.query as never);
      res.json(invoices);
    } catch (err) {
      next(err);
    }
  }

  async getInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await billingService.getInvoice(req.params.id as string);
      res.json(invoice);
    } catch (err) {
      next(err);
    }
  }
}

export const billingController = new BillingController();
