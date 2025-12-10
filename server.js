const express = require("express");
const cors = require("cors");
const { MercadoPagoConfig, Preference } = require("mercadopago");

// 1. TUS CREDENCIALES DE PRODUCCIÓN
const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN,
});
const app = express();
const port = process.env.PORT || 3000;

// --- CONFIGURACIÓN PRODUCCIÓN ---
// Ya ponemos tu URL real de Netlify
const BASE_URL = "https://tiendaanila.netlify.app"; 

app.use(cors());
app.use(express.json());

const PRODUCTS_DB = [
    { id: 1, title: "VESTIDO SEDA FLORAL", price: 1000 },
    { id: 2, title: "BLAZER OVERSIZE", price: 1000 },
    { id: 3, title: "TOP LINO NEGRO", price: 1000 },
    { id: 4, title: "CAMISA CLÁSICA OXFORD", price: 1000 },
    { id: 5, title: "TRAJE ITALIANO SLIM", price: 1000 },
    { id: 6, title: "BOLSO DE MANO PIEL", price: 1000 },
    { id: 7, title: "RELOJ MINIMALISTA", price: 1000 },
    { id: 8, title: "GAFAS DE SOL RETRO", price: 1000 }
];

app.post("/create_preference", async (req, res) => {
    try {
        const { items, buyer, shippingCost, orderId } = req.body;

        if (!items || items.length === 0) return res.status(400).json({ error: "Carrito vacío" });

        const itemsToBuy = items.map(item => {
            const product = PRODUCTS_DB.find(p => p.id === Number(item.id));
            if (!product) return { id: "unknown", title: "Producto", quantity: 1, unit_price: 100, currency_id: "ARS" };
            return {
                id: product.id,
                title: product.title,
                quantity: Number(item.qty),
                unit_price: Number(product.price),
                currency_id: "ARS"
            };
        });

        const body = {
            items: itemsToBuy,
            payer: {
                email: buyer.email || "test_user_123@test.com",
                name: buyer.name || "Test",
                identification: { type: "DNI", number: buyer.dni || "12345678" }
            },
            shipments: {
                cost: Number(shippingCost) || 0,
                mode: "not_specified",
            },
            external_reference: orderId,
            
            // URLs apuntando a tu Netlify real
            back_urls: {
                success: `${BASE_URL}/perfil.html`,
                failure: `${BASE_URL}/checkout.html`,
                pending: `${BASE_URL}/perfil.html`
            },
            // AHORA SÍ: Activamos el retorno automático porque es HTTPS seguro
            auto_return: "approved", 
        };

        const preference = new Preference(client);
        const result = await preference.create({ body });
        
        res.json({ id: result.id });

    } catch (error) {
        console.error("ERROR MP:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`SERVIDOR LISTO en puerto ${port}`);

});

