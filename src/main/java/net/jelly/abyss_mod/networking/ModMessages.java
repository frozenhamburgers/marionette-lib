package net.jelly.abyss_mod.networking;

import net.jelly.abyss_mod.AbyssMod;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Entity;
import net.minecraftforge.network.NetworkDirection;
import net.minecraftforge.network.NetworkRegistry;
import net.minecraftforge.network.PacketDistributor;
import net.minecraftforge.network.simple.SimpleChannel;

public class ModMessages {
    private static SimpleChannel INSTANCE;

    private static int packetId = 0;
    private static int id() {
        return packetId++;
    }

    public static void register() {
        SimpleChannel net = NetworkRegistry.ChannelBuilder
                .named(new ResourceLocation(AbyssMod.MODID, "messages"))
                .networkProtocolVersion(() -> "1.0")
                .clientAcceptedVersions(s -> true)
                .serverAcceptedVersions(s -> true)
                .simpleChannel();

        INSTANCE = net;

        net.messageBuilder(HurtMainBodyC2S.class, id(), NetworkDirection.PLAY_TO_SERVER)
                .decoder(HurtMainBodyC2S::new)
                .encoder(HurtMainBodyC2S::toBytes)
                .consumerMainThread(HurtMainBodyC2S::handle)
                .add();

        net.messageBuilder(MultipartEntityMessage.class, id(), NetworkDirection.PLAY_TO_SERVER)
                .decoder(MultipartEntityMessage::read)
                .encoder(MultipartEntityMessage::write)
                .consumerMainThread(MultipartEntityMessage::handle)
                .add();
    }

    public static <MSG> void sendToServer(MSG message) {
        INSTANCE.sendToServer(message);
    }

    public static <MSG> void sendToPlayer(MSG message, ServerPlayer player) {
        INSTANCE.send(PacketDistributor.PLAYER.with(() -> player), message);
    }

    public static <MSG> void sendToTrackingPlayers(MSG message, Entity entity) {
        INSTANCE.send(PacketDistributor.TRACKING_ENTITY.with(() -> entity), message);
    }
}