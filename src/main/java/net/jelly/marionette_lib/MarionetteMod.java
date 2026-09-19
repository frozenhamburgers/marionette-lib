package net.jelly.marionette_lib;

import com.mojang.logging.LogUtils;
import net.jelly.marionette_lib.entity.ModEntities;
import net.jelly.marionette_lib.entity.examples.octopus.OctopusRenderer;
import net.jelly.marionette_lib.entity.examples.tentacle.TentacleRenderer;
import net.jelly.marionette_lib.entity.examples.worm.WormRenderer;
import net.jelly.marionette_lib.entity.examples.wyvern.WyvernRenderer;
import net.jelly.marionette_lib.item.ModItems;
import net.jelly.marionette_lib.networking.ModMessages;
import net.minecraft.client.renderer.entity.EntityRenderers;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.common.MinecraftForge;
import net.minecraftforge.event.server.ServerStartingEvent;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.event.lifecycle.FMLClientSetupEvent;
import net.minecraftforge.fml.event.lifecycle.FMLCommonSetupEvent;
import net.minecraftforge.fml.javafmlmod.FMLJavaModLoadingContext;
import org.slf4j.Logger;

import static net.minecraftforge.common.brewing.BrewingRecipeRegistry.addRecipe;

// The value here should match an entry in the META-INF/mods.toml file
@Mod(MarionetteMod.MODID)
public class MarionetteMod
{
    // Define mod id i n a common place for everything to reference
    public static final String MODID = "marionette_lib";
    // Directly reference a slf4j logger
    private static final Logger LOGGER = LogUtils.getLogger();

    public MarionetteMod()
    {
        IEventBus modEventBus = FMLJavaModLoadingContext.get().getModEventBus();

        // register
        ModItems.register(modEventBus);

        //registers mobs
        ModEntities.register(modEventBus);

        // Register the commonSetup method for modloading
        modEventBus.addListener(this::commonSetup);

        // register sounds
//        ModSounds.register(modEventBus);

        // register particles
//        ParticleRegistry.register(modEventBus);

        // Register our mod's ForgeConfigSpec so that Forge can create and load the config file for us
//        ModLoadingContext.get().registerConfig(ModConfig.Type.COMMON, CommonConfigs.SPEC, "sandwormmod-common.toml");

        // Register ourselves for server and other game events we are interested in
        MinecraftForge.EVENT_BUS.register(this);
    }

    // common setup
    private void commonSetup(final FMLCommonSetupEvent event)
    {
        event.enqueueWork(() -> {
            ModMessages.register(); // networking: HAS TO BE FIRST LINE HERE
//            AdvancementTriggerRegistry.init();
        });
    }

    // You can use SubscribeEvent and let the Event Bus discover methods to call
    @SubscribeEvent
    public void onServerStarting(ServerStartingEvent event)
    {
    }

    // You can use EventBusSubscriber to automatically register all static methods in the class annotated with @SubscribeEvent
    @Mod.EventBusSubscriber(modid = MODID, bus = Mod.EventBusSubscriber.Bus.MOD, value = Dist.CLIENT)
    public static class ClientModEvents
    {
        @SubscribeEvent
        public static void onClientSetup(FMLClientSetupEvent event)
        {
            // register entity renderers
            EntityRenderers.register(ModEntities.WORM.get(), WormRenderer::new);
            EntityRenderers.register(ModEntities.OCTOPUS.get(), OctopusRenderer::new);
            EntityRenderers.register(ModEntities.WYVERN.get(), WyvernRenderer::new);
            EntityRenderers.register(ModEntities.TENTACLE.get(), TentacleRenderer::new);

        }
    }
}
