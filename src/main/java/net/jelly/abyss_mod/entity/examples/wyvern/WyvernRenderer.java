package net.jelly.abyss_mod.entity.examples.wyvern;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.math.Axis;
import net.jelly.abyss_mod.AbyssMod;
import net.minecraft.client.model.geom.ModelLayerLocation;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.MobRenderer;
import net.minecraft.client.renderer.entity.PhantomRenderer;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.monster.Phantom;

public class WyvernRenderer extends MobRenderer<WyvernEntity, WyvernModel> {
    private static final ResourceLocation TEXTURE = new ResourceLocation("abyss_mod:textures/entity/worm.png");
    public static final ModelLayerLocation WYVERN_LAYER = new ModelLayerLocation(
            new ResourceLocation(AbyssMod.MODID, "wyvern_layer"), "main");

    public WyvernRenderer(EntityRendererProvider.Context pContext) {
        super(pContext, new WyvernModel(pContext.bakeLayer(WYVERN_LAYER)), 1.0f);
    }

    @Override
    protected void setupRotations(WyvernEntity pEntityLiving, PoseStack pPoseStack, float pAgeInTicks, float pRotationYaw, float pPartialTicks) {
        pPoseStack.mulPose(Axis.YP.rotationDegrees(180));
    }

    //    public boolean shouldRender(WormEntity entity, Frustum camera, double x, double y, double z) {
//        if (super.shouldRender(entity, camera, x, y, z)) {
//            return true;
//        } else {
//            for (PartEntity part : entity.getParts()) {
//                if (camera.isVisible(part.getBoundingBoxForCulling())) {
//                    return true;
//                }
//            }
//            return false;
//        }
//    }

    @Override
    public ResourceLocation getTextureLocation(WyvernEntity pEntity) {
        return TEXTURE;
    }
}
