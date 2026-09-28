import { AppError } from "../middleware/error-handler.js";

const PROPERTY_API =
  process.env.PROPERTY_SERVICE_URL || "http://localhost:3001/v1";

export interface HotelRef {
  hotel_id: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
}

/**
 * Cliente HTTP hacia Property Service (BL-4: país del hotel para la
 * normativa fiscal aplicable a la factura). Sin FK entre bases.
 * Timeout de 3s por llamada (documento de arquitectura §6.5).
 */
export async function fetchHotel(id: string): Promise<HotelRef | null> {
  let res: Response;
  try {
    res = await fetch(`${PROPERTY_API}/hotels/${id}`, {
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    throw new AppError(
      502,
      "Property Service unavailable",
      "Bad Gateway"
    );
  }

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new AppError(
      502,
      `Property Service error: ${res.status}`,
      "Bad Gateway"
    );
  }

  return (await res.json()) as HotelRef;
}
