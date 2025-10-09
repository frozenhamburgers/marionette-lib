package net.jelly.abyss_mod.networking;

import net.minecraft.network.FriendlyByteBuf;
import net.minecraft.network.syncher.EntityDataAccessor;
import net.minecraft.world.entity.Entity;
import net.minecraftforge.network.NetworkEvent;

import java.util.function.Supplier;

public class SegmentMovePacket {
    private final int entityId;
    private final double posX, posY, posZ;

    public SegmentMovePacket(int entityId, double posX, double posY, double posZ) {
        this.entityId = entityId;
        this.posX = posX;
        this.posY = posY;
        this.posZ = posZ;
    }

    public SegmentMovePacket(FriendlyByteBuf buf) {
        this.entityId = buf.readInt();
        this.posX = buf.readDouble();
        this.posY = buf.readDouble();
        this.posZ = buf.readDouble();
    }

    public void encode(FriendlyByteBuf buf) {
        buf.writeInt(entityId);
        buf.writeDouble(posX);
        buf.writeDouble(posY);
        buf.writeDouble(posZ);
    }

    public void handle(Supplier<NetworkEvent.Context> contextSupplier) {
        NetworkEvent.Context context = contextSupplier.get();
        context.enqueueWork(() -> {
            // Handle packet on the client
            System.out.println("moving on client: TRUE");
            var clientWorld = net.minecraft.client.Minecraft.getInstance().level;
            if (clientWorld != null) {
                Entity entity = clientWorld.getEntity(entityId);
                if (entity != null) {
                    entity.moveTo(posX, posY, posZ); // Update position
                }
            }
        });
        context.setPacketHandled(true);
    }
}
